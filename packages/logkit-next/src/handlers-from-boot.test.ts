import { once } from "node:events";
import type http from "node:http";
import { getLogTail } from "@buchanan-solutions/logkit/ring";
import { afterEach, describe, expect, it } from "vitest";
import {
  createNextLogControlHandlersFromBoot,
  createNextLogIngestHandlersFromBoot,
} from "./handlers-from-boot.ts";
import { registerNextServerLogging } from "./register-server-logging.ts";

describe("createNextLogControlHandlersFromBoot", () => {
  const globalKey = `__testBootHandlers_${crypto.randomUUID()}`;

  afterEach(async () => {
    const server = (globalThis as unknown as Record<string, http.Server | undefined>)[
      `${globalKey}_debugHttp`
    ];
    if (server) {
      if (!server.listening) await once(server, "listening");
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    delete (globalThis as Record<string, unknown>)[globalKey];
    delete (globalThis as Record<string, unknown>)[`${globalKey}_debugHttp`];
  });

  it("returns 503 when server logging is not registered", async () => {
    const handlers = createNextLogControlHandlersFromBoot({
      app: "missing",
      globalKey,
      isAllowed: () => true,
    });
    const res = await handlers.GET(new Request("http://test/log/tail"), {
      params: Promise.resolve({ slug: ["log", "tail"] }),
    });
    expect(res.status).toBe(503);
  });

  it("returns 404 when isAllowed is false", async () => {
    registerNextServerLogging({ app: "boot-deny", globalKey, debugPort: 0 });
    const handlers = createNextLogControlHandlersFromBoot({
      app: "boot-deny",
      globalKey,
      isAllowed: () => false,
    });
    const res = await handlers.GET(new Request("http://test/log/tail"), {
      params: Promise.resolve({ slug: ["log", "tail"] }),
    });
    expect(res.status).toBe(404);
  });
});

describe("createNextLogIngestHandlersFromBoot", () => {
  const globalKey = `__testBootIngest_${crypto.randomUUID()}`;

  afterEach(async () => {
    const server = (globalThis as unknown as Record<string, http.Server | undefined>)[
      `${globalKey}_debugHttp`
    ];
    if (server) {
      if (!server.listening) await once(server, "listening");
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    delete (globalThis as Record<string, unknown>)[globalKey];
    delete (globalThis as Record<string, unknown>)[`${globalKey}_debugHttp`];
  });

  it("ingests client lines into the boot ring", async () => {
    registerNextServerLogging({ app: "boot-ingest", globalKey, debugPort: 0 });
    const handlers = createNextLogIngestHandlersFromBoot({
      app: "boot-ingest",
      globalKey,
      isAllowed: () => true,
    });

    const post = await handlers.POST(
      new Request("http://test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: [
            {
              ts: Date.now(),
              logger_id: "browser",
              level: "warn",
              message: "client line",
            },
          ],
        }),
      }),
    );
    expect(post.status).toBe(200);

    const state = registerNextServerLogging({ app: "boot-ingest", globalKey, debugPort: 0 });
    const tail = getLogTail(state.logRing, 5);
    expect(
      tail.lines.some(
        (l) => l.message === "client line" && (l as { source?: string }).source === "client",
      ),
    ).toBe(true);
  });
});
