import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogControlClient } from "./control-client.ts";

describe("createLogControlClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /tail under a nested mount base", async () => {
    let url = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        url = input;
        return new Response(JSON.stringify({ lines: [] }), { status: 200 });
      }),
    );

    const client = createLogControlClient({ base: "/api/debug" });
    await client.log.tail(10, "err");
    expect(url).toBe("/api/debug/tail?n=10&q=err");
  });

  it("calls /loggers under an absolute mount URL", async () => {
    let url = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        url = input;
        return new Response(JSON.stringify([]), { status: 200 });
      }),
    );

    const client = createLogControlClient({ base: "http://127.0.0.1:6060/api/logging" });
    await client.log.listLoggers();
    expect(url).toBe("http://127.0.0.1:6060/api/logging/loggers");
  });

  it("calls health on the same mount as controls", async () => {
    let url = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        url = input;
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }),
    );

    const client = createLogControlClient({ base: "http://127.0.0.1:8080/api/t-log/" });
    await client.health();
    expect(url).toBe("http://127.0.0.1:8080/api/t-log/health");
  });

  it("supports /api/loggers mount (list at /api/loggers/loggers)", async () => {
    let url = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        url = input;
        return new Response(JSON.stringify([]), { status: 200 });
      }),
    );

    const client = createLogControlClient({ base: "http://127.0.0.1:6060/api/loggers" });
    await client.log.listLoggers();
    expect(url).toBe("http://127.0.0.1:6060/api/loggers/loggers");
  });
});
