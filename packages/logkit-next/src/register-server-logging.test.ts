import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { getNextServerLoggingState, registerNextServerLogging } from "./register-server-logging.ts";

function listenPort(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr == null || typeof addr === "string") {
        reject(new Error("expected TCP address"));
        return;
      }
      resolve(addr.port);
    });
  });
}

describe("registerNextServerLogging", () => {
  const globalKey = `__testNextLogging_${crypto.randomUUID()}`;

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[globalKey];
    delete (globalThis as Record<string, unknown>)[`${globalKey}_debugHttp`];
  });

  it("getNextServerLoggingState is undefined before register", () => {
    expect(getNextServerLoggingState({ app: "test-next", globalKey })).toBeUndefined();
  });

  it("returns rootLog and does not bind a second debug port on re-entry", async () => {
    const holder = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end();
    });
    const freePort = await listenPort(holder);
    await new Promise<void>((resolve, reject) => {
      holder.close((err) => (err ? reject(err) : resolve()));
    });

    process.env.DEBUG_PORT = String(freePort);

    const first = registerNextServerLogging({ app: "test-next", globalKey });
    expect(first.rootLog).toBeDefined();
    expect(first.loggerFactory).toBeDefined();
    await first.bootstrapPromise;
    expect(getNextServerLoggingState({ app: "test-next", globalKey })).toBe(first);

    const second = registerNextServerLogging({ app: "test-next", globalKey });
    expect(second.rootLog).toBe(first.rootLog);

    const debugServer = (globalThis as unknown as Record<string, http.Server | undefined>)[
      `${globalKey}_debugHttp`
    ];
    expect(debugServer).toBeDefined();

    await new Promise<void>((resolve, reject) => {
      if (debugServer == null) {
        resolve();
        return;
      }
      if (debugServer.listening) {
        debugServer.close((err) => (err ? reject(err) : resolve()));
        return;
      }
      debugServer.once("listening", () => {
        debugServer.close((err) => (err ? reject(err) : resolve()));
      });
    });
    delete process.env.DEBUG_PORT;
  });
});
