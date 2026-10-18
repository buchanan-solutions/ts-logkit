import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogControlClient } from "./control-client.ts";

describe("createLogControlClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /log/tail under a relative debug base", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ lines: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createLogControlClient({ base: "/api/debug" });
    await client.log.tail(10, "err");

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toBe("/api/debug/log/tail?n=10&q=err");
  });

  it("calls /log/loggers under an absolute debug port base", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createLogControlClient({ base: "http://127.0.0.1:6060" });
    await client.log.listLoggers();

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toBe("http://127.0.0.1:6060/log/loggers");
  });
});
