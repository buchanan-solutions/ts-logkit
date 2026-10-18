import type { LoggerLike, Registry } from "@buchanan-solutions/logkit";
import type { LogLine, RingBuffer } from "@buchanan-solutions/logkit/ring";

import { normalizeMount, resolveDebugPort } from "@buchanan-solutions/logkit/ring";
import Fastify from "fastify";
import { createLogRoutes } from "./log-routes.ts";

export type StartDebugHttpServerOptions = {
  rootLog: LoggerLike;
  loggerStorage: "redis" | "memory";
  loggerRegistry: Registry;
  logRing: RingBuffer<LogLine>;
  serviceName: string;
  debugPort?: number;
  /** Contract mount for tail/loggers/health (default `/`). */
  debugMount?: string;
};

/**
 * Starts the private debug / log listener (DEBUG_PORT, default 6060) on Fastify.
 */
export function startDebugHttpServer(options: StartDebugHttpServerOptions): void {
  const debugPort = options.debugPort ?? resolveDebugPort();
  const debugMount = normalizeMount(options.debugMount ?? "/");
  const { serviceName, rootLog, loggerStorage, loggerRegistry, logRing } = options;
  const log = rootLog.child("debug-http");

  const app = Fastify({ logger: false });

  app.get("/healthcheck", async () => ({ status: "ok", name: serviceName }));
  app.get("/status", async () => ({
    status: "ok" as const,
    name: serviceName,
    loggerStorage,
  }));

  void (async () => {
    try {
      await app.register(createLogRoutes({ logRing, loggerRegistry }), {
        ...(debugMount === "/" ? {} : { prefix: debugMount }),
      });
      await app.listen({ port: debugPort, host: "0.0.0.0" });
      const mountLabel = debugMount === "/" ? "" : debugMount;
      log.info(
        `debug listening at 0.0.0.0:${debugPort} (GET ${mountLabel}/health, /status, ${mountLabel}/tail, ${mountLabel}/loggers)`,
      );
    } catch (err: unknown) {
      log.error("debug listener failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}
