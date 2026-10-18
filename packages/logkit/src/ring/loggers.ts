import { LEVELS, type Level, type Registry } from "../index";

/**
 * Parses a JSON body `{ level }` into a kit Level, or an error message.
 */
export function parseLevelBody(body: unknown): { level?: Level; error?: string } {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { error: "body must be a JSON object" };
  }
  const raw = (body as { level?: unknown }).level;
  if (typeof raw !== "string") {
    return { error: "level must be a string" };
  }
  const level = raw.toLowerCase();
  if (!(LEVELS as readonly string[]).includes(level)) {
    return { error: `level must be one of: ${LEVELS.join(", ")}` };
  }
  return { level: level as Level };
}

export function listLoggerLevels(registry: Registry) {
  return registry.listLevels();
}

export function getLoggerLevel(registry: Registry, id: string) {
  return {
    id,
    configured: registry.lookupConfigured(id),
    effective: registry.getEffectiveLevel(id),
  };
}

export function updateLoggerLevel(registry: Registry, id: string, level: Level) {
  registry.update(id, level);
  return getLoggerLevel(registry, id);
}

export function unsetLoggerLevel(registry: Registry, id: string) {
  registry.unset(id);
  return getLoggerLevel(registry, id);
}

/**
 * Reads the full request body as UTF-8 text (Node HTTP).
 */
export function readRequestBody(req: {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}
