import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

/** True after NodeSDK was started (endpoint was set). */
let tracesEnabled = false;
let sdk: NodeSDK | undefined;

export type RegisterNextTracingOptions = {
  serviceName?: string;
};

/**
 * Normalizes an OTLP base endpoint into the traces path (`…/v1/traces`).
 */
export function resolveTracesUrl(endpoint: string): string {
  const base = endpoint.trim().replace(/\/+$/, "");
  return `${base}/v1/traces`;
}

/**
 * Whether OTLP trace export is configured for this process.
 */
export function isOtelTracesEnabled(): boolean {
  return tracesEnabled;
}

/**
 * Bounded best-effort SDK shutdown. Safe if never started.
 */
export async function shutdownOtelTracing(timeoutMs = 5_000): Promise<void> {
  const active = sdk;
  sdk = undefined;
  tracesEnabled = false;
  if (active == null) return;

  await Promise.race([
    active.shutdown(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

function ignoreOtlpExportRequest(request: { origin?: string; path?: string }): boolean {
  const path = request.path ?? "";
  return path.includes("/v1/traces") || path.includes("/v1/logs");
}

/**
 * Boots NodeSDK + Undici fetch propagation when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
 * Soft no-op when unset. Idempotent per process.
 */
export function registerNextTracing(options?: RegisterNextTracingOptions): void {
  if (tracesEnabled) return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (endpoint == null || endpoint === "") {
    tracesEnabled = false;
    return;
  }

  const serviceName =
    process.env.OTEL_SERVICE_NAME?.trim() || options?.serviceName?.trim() || "nextjs";

  process.env.NEXT_OTEL_FETCH_DISABLED = "1";

  const exporter = new OTLPTraceExporter({
    url: resolveTracesUrl(endpoint),
  });

  const undici = new UndiciInstrumentation({
    requireParentforSpans: true,
    ignoreRequestHook: ignoreOtlpExportRequest,
  });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        scheduledDelayMillis: 1_000,
      }),
    ],
    instrumentations: [undici],
  });

  sdk.start();
  registerInstrumentations({ instrumentations: [undici] });
  tracesEnabled = true;

  const flush = () => {
    void shutdownOtelTracing();
  };
  process.once("SIGTERM", flush);
  process.once("SIGINT", flush);
  process.once("beforeExit", flush);
}
