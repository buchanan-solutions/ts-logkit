import type { Event, Formatter, Level, Transport } from "@buchanan-solutions/logkit";
import { context, isSpanContextValid, trace } from "@opentelemetry/api";

/** OTel SeverityNumber (log data model). */
const SEVERITY_NUMBER: Record<Level, number> = {
  trace: 1,
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
  fatal: 21,
};

export type CreateOtelTransportOptions = {
  /** Resource attribute `service.name` (e.g. licensing). */
  serviceName: string;
  /**
   * OTLP base URL (`http://observability:4318`).
   * When unset/empty, transport is a no-op so local boot without a collector still works.
   */
  endpoint?: string;
  /**
   * Optional resource attribute `deployment.environment` (e.g. production | test | demo).
   * Trimmed; empty / missing → omitted from the payload (do not emit `-` / `unset`).
   */
  deploymentEnvironment?: string;
};

export type ActiveSpanIds = {
  traceId: string;
  spanId: string;
};

export type EventToOtlpPayloadOptions = {
  /** Optional W3C span ids for Tempo↔Loki correlation. */
  spanIds?: ActiveSpanIds;
  /**
   * Optional `deployment.environment` resource attribute.
   * Trimmed; empty / missing → omitted.
   */
  deploymentEnvironment?: string;
};

type OtlpAnyValue =
  | { stringValue: string }
  | { intValue: string }
  | { boolValue: boolean }
  | { doubleValue: number };

type OtlpKeyValue = { key: string; value: OtlpAnyValue };

/**
 * Normalizes an OTLP base endpoint into the logs path (`…/v1/logs`).
 */
export function resolveLogsUrl(endpoint: string): string {
  const base = endpoint.trim().replace(/\/+$/, "");
  return `${base}/v1/logs`;
}

/**
 * Reads W3C trace/span ids from the active `@opentelemetry/api` span, if any.
 * No active / invalid span → undefined (log ships without correlation fields).
 */
export function readActiveSpanIds(): ActiveSpanIds | undefined {
  const span = trace.getSpan(context.active());
  const spanContext = span?.spanContext();
  if (spanContext == null || !isSpanContextValid(spanContext)) return undefined;
  return { traceId: spanContext.traceId, spanId: spanContext.spanId };
}

/**
 * Trims a deployment-environment string; empty / whitespace → undefined (omit from OTLP).
 */
function normalizeDeploymentEnvironment(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed == null || trimmed === "" ? undefined : trimmed;
}

/**
 * JSON-serializes Event.args for OTLP attributes (drops non-JSON values safely).
 */
function serializeArgs(args: unknown[] | undefined): string | undefined {
  if (args == null || args.length === 0) return undefined;
  try {
    return JSON.stringify(args);
  } catch {
    return JSON.stringify(args.map((a) => String(a)));
  }
}

/**
 * Builds one OTLP/JSON ExportLogsServiceRequest from a ts-logkit Event.
 * Kept pure so unit tests can assert the payload without hitting the network.
 * When `spanIds` is set, stamps OTLP `traceId` / `spanId` for Tempo↔Loki correlation.
 * When `deploymentEnvironment` is set (non-empty after trim), stamps resource
 * `deployment.environment`; otherwise that key is omitted.
 */
export function eventToOtlpPayload(
  event: Event,
  serviceName: string,
  options?: EventToOtlpPayloadOptions,
): object {
  const attributes: OtlpKeyValue[] = [
    { key: "logger_id", value: { stringValue: event.logger_id } },
    { key: "level", value: { stringValue: event.level } },
  ];

  const argsJson = serializeArgs(event.args);
  if (argsJson != null) {
    attributes.push({ key: "args", value: { stringValue: argsJson } });
  }

  if (event.error) {
    attributes.push(
      { key: "exception.type", value: { stringValue: event.error.name } },
      { key: "exception.message", value: { stringValue: event.error.message } },
    );
    if (event.error.stack) {
      attributes.push({
        key: "exception.stacktrace",
        value: { stringValue: event.error.stack },
      });
    }
  }

  // Event.timestamp is ms since epoch (Date.now-style); OTLP wants nanos as a decimal string.
  const timeUnixNano = String(Math.trunc(event.timestamp) * 1_000_000);

  const logRecord: Record<string, unknown> = {
    timeUnixNano,
    severityNumber: SEVERITY_NUMBER[event.level] ?? 9,
    severityText: event.level.toUpperCase(),
    body: { stringValue: event.message },
    attributes,
  };

  const spanIds = options?.spanIds;
  if (spanIds != null) {
    logRecord.traceId = spanIds.traceId;
    logRecord.spanId = spanIds.spanId;
    logRecord.flags = 1;
  }

  const resourceAttributes: OtlpKeyValue[] = [
    {
      key: "service.name",
      value: { stringValue: serviceName },
    },
  ];

  const deploymentEnvironment = normalizeDeploymentEnvironment(options?.deploymentEnvironment);
  if (deploymentEnvironment != null) {
    resourceAttributes.push({
      key: "deployment.environment",
      value: { stringValue: deploymentEnvironment },
    });
  }

  return {
    resourceLogs: [
      {
        resource: {
          attributes: resourceAttributes,
        },
        scopeLogs: [
          {
            scope: { name: "ts-logkit" },
            logRecords: [logRecord],
          },
        ],
      },
    ],
  };
}

/**
 * Fire-and-forget POST; never throws into the logger emit path.
 */
function postOtlp(url: string, body: object): void {
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    /* collector down — do not break app logging */
  });
}

/**
 * Builds a ts-logkit Transport that ships each Event as OTLP/HTTP JSON logs.
 * Soft-disables when `endpoint` is unset so Redis policy / console / ring keep working alone.
 * Stamps active-span ids when `@opentelemetry/api` has a valid span in context.
 * Optional `deploymentEnvironment` becomes resource `deployment.environment` when non-empty.
 */
export function createOtelTransport(options: CreateOtelTransportOptions): Transport {
  const endpoint = options.endpoint?.trim();
  if (endpoint == null || endpoint === "") {
    return {
      log(_event: Event, _formatter?: Formatter) {
        /* no-op: OTEL_EXPORTER_OTLP_ENDPOINT not configured */
      },
    };
  }

  const url = resolveLogsUrl(endpoint);
  const { serviceName } = options;
  const deploymentEnvironment = normalizeDeploymentEnvironment(options.deploymentEnvironment);

  return {
    log(event: Event, _formatter?: Formatter) {
      const spanIds = readActiveSpanIds();
      const payloadOptions: EventToOtlpPayloadOptions = {};
      if (spanIds != null) payloadOptions.spanIds = spanIds;
      if (deploymentEnvironment != null) {
        payloadOptions.deploymentEnvironment = deploymentEnvironment;
      }
      postOtlp(url, eventToOtlpPayload(event, serviceName, payloadOptions));
    },
  };
}
