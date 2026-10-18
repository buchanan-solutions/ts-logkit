import type { Level, Registry } from "@buchanan-solutions/logkit";
import {
  getLoggerLevel,
  parseLevelBody,
  unsetLoggerLevel,
  updateLoggerLevel,
} from "@buchanan-solutions/logkit/ring";
import type { FastifyPluginAsync } from "fastify";

export type LoggerRoutesOptions = {
  loggerRegistry: Registry;
};

/**
 * Logger admin on the debug listener: list + get/set/unset exact ids.
 */
export function createLoggerRoutes(options: LoggerRoutesOptions): FastifyPluginAsync {
  const { loggerRegistry } = options;
  return async (app) => {
    app.get("/", async () => loggerRegistry.listLevels());

    app.get<{ Params: { id: string } }>("/:id", async (request) => {
      const id = decodeURIComponent(request.params.id);
      return getLoggerLevel(loggerRegistry, id);
    });

    app.put<{ Params: { id: string } }>("/:id", async (request, reply) => {
      const id = decodeURIComponent(request.params.id);
      const parsed = parseLevelBody(request.body);
      if (parsed.error || !parsed.level) {
        return reply.code(400).send({ error: parsed.error ?? "invalid level" });
      }
      try {
        return updateLoggerLevel(loggerRegistry, id, parsed.level as Level);
      } catch (err: unknown) {
        return reply.code(500).send({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
      const id = decodeURIComponent(request.params.id);
      try {
        return unsetLoggerLevel(loggerRegistry, id);
      } catch (err: unknown) {
        return reply.code(500).send({ error: err instanceof Error ? err.message : String(err) });
      }
    });
  };
}
