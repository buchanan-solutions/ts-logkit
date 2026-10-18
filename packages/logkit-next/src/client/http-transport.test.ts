import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpLogTransport, isClientHttpLogEnabled } from "./http-transport.ts";

describe("isClientHttpLogEnabled", () => {
  it("is true only in development without kill switch", () => {
    expect(isClientHttpLogEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(
      isClientHttpLogEnabled({
        NODE_ENV: "development",
        NEXT_PUBLIC_DISABLE_LOG_TELEMETRY: "true",
      }),
    ).toBe(false);
    expect(isClientHttpLogEnabled({ NODE_ENV: "production" })).toBe(false);
  });
});

describe("createHttpLogTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs one line and swallows fetch errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const transport = createHttpLogTransport({ ingestUrl: "/api/debug/log" });
    transport.log({
      timestamp: 1,
      logger_id: "ui",
      level: "warn",
      message: "hello",
      args: [],
    });

    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/debug/log");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as { lines: { message: string }[] };
    expect(body.lines[0]?.message).toBe("hello");
  });
});
