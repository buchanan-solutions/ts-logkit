import type { Registry } from "@buchanan-solutions/logkit";
import type { LogLine, RingBuffer } from "@buchanan-solutions/logkit/ring";
import { getLogTail, parseTailN } from "@buchanan-solutions/logkit/ring";
import type { FastifyPluginAsync } from "fastify";
import { createLoggerRoutes } from "./loggers-routes.ts";

export type LogRoutesOptions = {
  logRing: RingBuffer<LogLine>;
  loggerRegistry: Registry;
};

/**
 * Mount-relative debug surface: health, logger CRUD, and ring-buffer tail.
 */
export function createLogRoutes(options: LogRoutesOptions): FastifyPluginAsync {
  const { logRing, loggerRegistry } = options;
  return async (app) => {
    app.get("/health", async () => ({ status: "ok" }));
    app.get("/healthz", async () => ({ status: "ok" }));

    await app.register(createLoggerRoutes({ loggerRegistry }), { prefix: "/loggers" });

    app.get<{ Querystring: { n?: string; q?: string } }>("/tail", async (request) => {
      const n = parseTailN(request.query.n);
      const q = request.query.q;
      return getLogTail(logRing, n, q);
    });
  };
}
