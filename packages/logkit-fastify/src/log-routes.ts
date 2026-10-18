import type { Registry } from "@buchanan-solutions/logkit";
import type { FastifyPluginAsync } from "fastify";

import type { LogLine, RingBuffer } from "@buchanan-solutions/logkit/ring";
import { getLogTail, parseTailN } from "@buchanan-solutions/logkit/ring";
import { createLoggerRoutes } from "./loggers-routes.ts";

export type LogRoutesOptions = {
  logRing: RingBuffer<LogLine>;
  loggerRegistry: Registry;
};

/**
 * Debug surface: logger CRUD + ring-buffer tail under `/log`.
 */
export function createLogRoutes(options: LogRoutesOptions): FastifyPluginAsync {
  const { logRing, loggerRegistry } = options;
  return async (app) => {
    await app.register(createLoggerRoutes({ loggerRegistry }), { prefix: "/loggers" });

    app.get<{ Querystring: { n?: string; q?: string } }>("/tail", async (request) => {
      const n = parseTailN(request.query.n);
      const q = request.query.q;
      return getLogTail(logRing, n, q);
    });
  };
}
