import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { nodeSdkStart, nodeSdkCtor } = vi.hoisted(() => ({
  nodeSdkStart: vi.fn(),
  nodeSdkCtor: vi.fn(),
}));

vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: class MockNodeSDK {
    constructor(opts: unknown) {
      nodeSdkCtor(opts);
    }
    start = nodeSdkStart;
    shutdown = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock("@opentelemetry/instrumentation", () => ({
  registerInstrumentations: vi.fn(),
}));

vi.mock("@opentelemetry/instrumentation-undici", () => ({
  UndiciInstrumentation: vi.fn(function UndiciInstrumentation() {
    return {};
  }),
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: vi.fn(function OTLPTraceExporter() {
    return {};
  }),
}));

describe("registerNextTracing", () => {
  const env = process.env;

  beforeEach(async () => {
    vi.resetModules();
    nodeSdkStart.mockClear();
    nodeSdkCtor.mockClear();
    process.env = { ...env };
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_SERVICE_NAME;
    delete process.env.NEXT_OTEL_FETCH_DISABLED;
    const mod = await import("./register-next-tracing.ts");
    await mod.shutdownOtelTracing(0);
  });

  afterEach(() => {
    process.env = env;
  });

  it("no-ops when OTEL_EXPORTER_OTLP_ENDPOINT is unset", async () => {
    const { registerNextTracing, isOtelTracesEnabled } = await import("./register-next-tracing.ts");
    expect(() => registerNextTracing()).not.toThrow();
    expect(isOtelTracesEnabled()).toBe(false);
    expect(nodeSdkStart).not.toHaveBeenCalled();
  });

  it("starts SDK once when endpoint is set", async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318";
    const { registerNextTracing, isOtelTracesEnabled } = await import("./register-next-tracing.ts");

    registerNextTracing({ serviceName: "nextjs" });
    registerNextTracing({ serviceName: "nextjs" });

    expect(isOtelTracesEnabled()).toBe(true);
    expect(nodeSdkStart).toHaveBeenCalledTimes(1);
    expect(process.env.NEXT_OTEL_FETCH_DISABLED).toBe("1");
  });
});

describe("resolveTracesUrl", () => {
  it("appends /v1/traces", async () => {
    const { resolveTracesUrl } = await import("./register-next-tracing.ts");
    expect(resolveTracesUrl("http://observability:4318/")).toBe(
      "http://observability:4318/v1/traces",
    );
  });
});
