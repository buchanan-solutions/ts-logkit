import { NoopLogger, Registry } from "@buchanan-solutions/logkit";
import { RingBuffer } from "@buchanan-solutions/logkit/ring";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createLogRoutes } from "./log-routes.ts";
import { startDebugHttpServer } from "./start-debug-http.ts";

vi.mock("fastify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fastify")>();
  return { ...actual, default: vi.fn(actual.default) };
});

const mounts = ["/", "/api/logging", "/api/t-log"];

describe("Fastify debug routes", () => {
  for (const mount of mounts) {
    it(`registers health and controls together at ${mount}`, async () => {
      const app = Fastify();
      const prefix = mount === "/" ? "" : mount;
      try {
        await app.register(
          createLogRoutes({ loggerRegistry: new Registry(), logRing: new RingBuffer(10) }),
          { prefix },
        );
        for (const suffix of ["/health", "/healthz", "/tail", "/loggers"]) {
          const response = await app.inject(`${prefix}${suffix}`);
          expect(response.statusCode).toBe(200);
          if (suffix.startsWith("/health")) expect(response.json()).toEqual({ status: "ok" });
        }
        if (prefix) expect((await app.inject("/health")).statusCode).toBe(404);
      } finally {
        await app.close();
      }
    });

    it(`starts the convenience listener without duplicate routes at ${mount}`, async () => {
      let app: ReturnType<typeof Fastify> | undefined;
      try {
        startDebugHttpServer({
          rootLog: NoopLogger,
          loggerStorage: "memory",
          loggerRegistry: new Registry(),
          logRing: new RingBuffer(10),
          serviceName: "test",
          debugPort: 0,
          debugMount: mount,
        });
        app = vi.mocked(Fastify).mock.results.at(-1)?.value;
        expect(app).toBeDefined();
        await vi.waitFor(() => expect(app?.server.listening).toBe(true));
        const prefix = mount === "/" ? "" : mount;
        expect((await app?.inject(`${prefix}/health`))?.json()).toEqual({ status: "ok" });
      } finally {
        await app?.close();
      }
    });
  }
});
