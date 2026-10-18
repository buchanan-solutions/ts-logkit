import { once } from "node:events";
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { Registry } from "../index";
import { ensureDebugHttpServer } from "./node/debug-http.ts";
import { createRingBufferTransport } from "./ring-buffer.ts";

async function closeServer(globalKey: string) {
  const server = (globalThis as unknown as Record<string, http.Server | undefined>)[globalKey];
  if (server) {
    if (!server.listening) await once(server, "listening");
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    delete (globalThis as unknown as Record<string, unknown>)[globalKey];
  }
}

function contractPath(mountPrefix: string, suffix: string): string {
  if (!mountPrefix) return suffix;
  return `${mountPrefix}${suffix}`;
}

async function fetchJson(origin: string, path: string, init?: RequestInit) {
  const res = await fetch(`${origin}${path}`, init);
  const body = await res.json();
  return { status: res.status, body };
}

describe("ensureDebugHttpServer mount routing", () => {
  const cases = [
    { name: "root mount", mount: "/", prefix: "" },
    { name: "nested /api/logging", mount: "/api/logging", prefix: "/api/logging" },
    { name: "nested /api/t-log", mount: "/api/t-log", prefix: "/api/t-log" },
    { name: "mount /api/loggers", mount: "/api/loggers", prefix: "/api/loggers" },
  ] as const;

  for (const { name, mount, prefix } of cases) {
    describe(name, () => {
      const globalKey = `__mountHttp_${name}_${crypto.randomUUID()}`;

      afterEach(async () => {
        await closeServer(globalKey);
      });

      it("serves health, loggers, and tail beneath the mount", async () => {
        const { buffer: logRing } = createRingBufferTransport({ capacity: 50 });
        const loggerRegistry = new Registry();
        const server = ensureDebugHttpServer({
          logRing,
          loggerRegistry,
          debugPort: 0,
          mount,
          globalKey,
        });
        await once(server, "listening");
        const addr = server.address();
        if (addr == null || typeof addr === "string") throw new Error("expected port");
        const origin = `http://127.0.0.1:${addr.port}`;

        const health = await fetchJson(origin, contractPath(prefix, "/health"));
        expect(health).toEqual({ status: 200, body: { status: "ok" } });

        const loggers = await fetchJson(origin, contractPath(prefix, "/loggers"));
        expect(loggers.status).toBe(200);

        const tail = await fetchJson(origin, contractPath(prefix, "/tail?n=5"));
        expect(tail.status).toBe(200);
        expect(tail.body).toMatchObject({ n: 5, lines: [] });
      });

      it("returns 404 outside the mount and for prefix lookalikes", async () => {
        const { buffer: logRing } = createRingBufferTransport({ capacity: 10 });
        const server = ensureDebugHttpServer({
          logRing,
          loggerRegistry: new Registry(),
          debugPort: 0,
          mount,
          globalKey,
        });
        await once(server, "listening");
        const addr = server.address();
        if (addr == null || typeof addr === "string") throw new Error("expected port");
        const origin = `http://127.0.0.1:${addr.port}`;

        if (mount !== "/") {
          const outside = await fetchJson(origin, "/health");
          expect(outside).toEqual({ status: 404, body: { error: "not found" } });

          const lookalike = await fetchJson(origin, `${mount}-other/tail`);
          expect(lookalike).toEqual({ status: 404, body: { error: "not found" } });
        }
      });
    });
  }

  it("accepts trailing slashes on mount paths", async () => {
    const globalKey = `__mountHttp_trailing_${crypto.randomUUID()}`;
    try {
      const { buffer: logRing } = createRingBufferTransport({ capacity: 10 });
      const server = ensureDebugHttpServer({
        logRing,
        loggerRegistry: new Registry(),
        debugPort: 0,
        mount: "/api/logging",
        globalKey,
      });
      await once(server, "listening");
      const addr = server.address();
      if (addr == null || typeof addr === "string") throw new Error("expected port");
      const origin = `http://127.0.0.1:${addr.port}`;
      const res = await fetchJson(origin, "/api/logging/health/");
      expect(res).toEqual({ status: 200, body: { status: "ok" } });
    } finally {
      await closeServer(globalKey);
    }
  });
});
