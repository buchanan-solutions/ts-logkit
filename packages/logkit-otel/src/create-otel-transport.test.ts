import { trace } from "@opentelemetry/api";
import { describe, expect, it, vi } from "vitest";

import {
  createOtelTransport,
  eventToOtlpPayload,
  readActiveSpanIds,
  resolveLogsUrl,
} from "./create-otel-transport";

describe("resolveLogsUrl", () => {
  it("appends /v1/logs and strips trailing slashes", () => {
    expect(resolveLogsUrl("http://observability:4318")).toBe("http://observability:4318/v1/logs");
    expect(resolveLogsUrl("http://observability:4318/")).toBe("http://observability:4318/v1/logs");
  });
});

describe("eventToOtlpPayload", () => {
  it("maps Event fields into OTLP resource/log attributes", () => {
    const payload = eventToOtlpPayload(
      {
        logger_id: "licensing.store",
        level: "info",
        message: "hello",
        timestamp: 1_700_000_000_000,
        args: [{ id: 1 }],
      },
      "licensing",
    ) as {
      resourceLogs: Array<{
        resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
        scopeLogs: Array<{
          logRecords: Array<{
            timeUnixNano: string;
            severityNumber: number;
            severityText: string;
            body: { stringValue: string };
            attributes: Array<{ key: string; value: { stringValue: string } }>;
          }>;
        }>;
      }>;
    };

    const resourceLog = payload.resourceLogs.at(0);
    expect(resourceLog).toBeDefined();
    if (!resourceLog) return;
    const resource = resourceLog.resource.attributes;
    expect(resource.find((a) => a.key === "service.name")?.value.stringValue).toBe("licensing");
    expect(resource.find((a) => a.key === "deployment.environment")).toBeUndefined();

    const record = resourceLog.scopeLogs.at(0)?.logRecords.at(0);
    expect(record).toBeDefined();
    expect(record!.body.stringValue).toBe("hello");
    expect(record!.severityNumber).toBe(9);
    expect(record!.severityText).toBe("INFO");
    expect(record!.timeUnixNano).toBe("1700000000000000000");
    expect(record!.attributes.find((a) => a.key === "logger_id")?.value.stringValue).toBe(
      "licensing.store",
    );
    expect(record!.attributes.find((a) => a.key === "args")?.value.stringValue).toBe('[{"id":1}]');
    expect(record!).not.toHaveProperty("traceId");
    expect(record!).not.toHaveProperty("spanId");
  });

  it("stamps traceId/spanId when span ids are provided", () => {
    const payload = eventToOtlpPayload(
      {
        logger_id: "licensing",
        level: "info",
        message: "correlated",
        timestamp: 1_700_000_000_000,
      },
      "licensing",
      {
        spanIds: {
          traceId: "00000000000000000000000000000001",
          spanId: "0000000000000001",
        },
      },
    ) as {
      resourceLogs: Array<{
        scopeLogs: Array<{
          logRecords: Array<{
            traceId?: string;
            spanId?: string;
            flags?: number;
          }>;
        }>;
      }>;
    };

    const record = payload.resourceLogs.at(0)?.scopeLogs.at(0)?.logRecords.at(0);
    expect(record).toBeDefined();
    expect(record!.traceId).toBe("00000000000000000000000000000001");
    expect(record!.spanId).toBe("0000000000000001");
    expect(record!.flags).toBe(1);
  });

  it("stamps deployment.environment when provided", () => {
    const payload = eventToOtlpPayload(
      {
        logger_id: "eos",
        level: "info",
        message: "hello",
        timestamp: 1_700_000_000_000,
      },
      "eos",
      { deploymentEnvironment: "demo" },
    ) as {
      resourceLogs: Array<{
        resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
      }>;
    };

    const resourceLog = payload.resourceLogs.at(0);
    expect(resourceLog).toBeDefined();
    if (!resourceLog) return;
    const resource = resourceLog.resource.attributes;
    expect(resource.find((a) => a.key === "deployment.environment")?.value.stringValue).toBe(
      "demo",
    );
  });

  it("omits deployment.environment when empty or whitespace", () => {
    for (const deploymentEnvironment of ["", "   "]) {
      const payload = eventToOtlpPayload(
        {
          logger_id: "eos",
          level: "info",
          message: "hello",
          timestamp: 1_700_000_000_000,
        },
        "eos",
        { deploymentEnvironment },
      ) as {
        resourceLogs: Array<{
          resource: {
            attributes: Array<{ key: string; value: { stringValue: string } }>;
          };
        }>;
      };

      const resourceLog = payload.resourceLogs.at(0);
      expect(resourceLog).toBeDefined();
      if (!resourceLog) return;
      expect(
        resourceLog.resource.attributes.find((a) => a.key === "deployment.environment"),
      ).toBeUndefined();
    }
  });

  it("omits deployment.environment when options omit it", () => {
    const payload = eventToOtlpPayload(
      {
        logger_id: "eos",
        level: "info",
        message: "hello",
        timestamp: 1_700_000_000_000,
      },
      "eos",
    ) as {
      resourceLogs: Array<{
        resource: {
          attributes: Array<{ key: string; value: { stringValue: string } }>;
        };
      }>;
    };

    const resourceLog = payload.resourceLogs.at(0);
    expect(resourceLog).toBeDefined();
    if (!resourceLog) return;
    expect(
      resourceLog.resource.attributes.find((a) => a.key === "deployment.environment"),
    ).toBeUndefined();
  });
});

describe("readActiveSpanIds", () => {
  it("returns undefined without an active span", () => {
    expect(readActiveSpanIds()).toBeUndefined();
  });

  it("reads ids from the active span context", () => {
    const spanContext = {
      traceId: "00000000000000000000000000000001",
      spanId: "0000000000000001",
      traceFlags: 1,
      isRemote: false,
    };
    vi.spyOn(trace, "getSpan").mockReturnValue({
      spanContext: () => spanContext,
    } as ReturnType<typeof trace.getSpan>);

    expect(readActiveSpanIds()).toEqual({
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    });

    vi.restoreAllMocks();
  });
});

describe("createOtelTransport", () => {
  it("is a no-op when endpoint is unset", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const transport = createOtelTransport({ serviceName: "licensing" });
    transport.log({
      logger_id: "licensing",
      level: "info",
      message: "noop",
      timestamp: Date.now(),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("is a no-op when endpoint is whitespace", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const transport = createOtelTransport({
      serviceName: "licensing",
      endpoint: "   ",
    });
    transport.log({
      logger_id: "licensing",
      level: "info",
      message: "noop",
      timestamp: Date.now(),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("POSTs OTLP/JSON to /v1/logs when endpoint is set", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const transport = createOtelTransport({
      serviceName: "licensing",
      endpoint: "http://observability:4318",
      deploymentEnvironment: "test",
    });
    transport.log({
      logger_id: "licensing",
      level: "warn",
      message: "shipped",
      timestamp: 1_700_000_000_000,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://observability:4318/v1/logs");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    const body = JSON.parse(String(init.body)) as {
      resourceLogs: Array<{
        resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
        scopeLogs: Array<{ logRecords: Array<{ severityText: string }> }>;
      }>;
    };
    const resourceLog = body.resourceLogs.at(0);
    expect(resourceLog).toBeDefined();
    if (!resourceLog) return;
    const shipped = resourceLog.scopeLogs.at(0)?.logRecords.at(0);
    expect(shipped?.severityText).toBe("WARN");
    expect(
      resourceLog.resource.attributes.find((a) => a.key === "deployment.environment")?.value
        .stringValue,
    ).toBe("test");
    fetchSpy.mockRestore();
  });
});
