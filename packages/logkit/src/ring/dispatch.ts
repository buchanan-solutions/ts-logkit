import type { Level, Registry } from "@buchanan-solutions/logkit";
import { ingestClientLogLines, type LogLineWithSource, parseLogIngestBody } from "./ingest.ts";
import {
  getLoggerLevel,
  listLoggerLevels,
  parseLevelBody,
  readRequestBody,
  unsetLoggerLevel,
  updateLoggerLevel,
} from "./loggers.ts";
import type { LogLine, RingBuffer } from "./ring-buffer.ts";
import { getLogTail, parseTailN } from "./tail.ts";

export type LogDispatchDeps = {
  loggerRegistry: Registry;
  logRing: RingBuffer<LogLine | LogLineWithSource>;
  /** Optional hook before registry reads (e.g. await bootstrap). */
  beforeRegistryAccess?: () => void | Promise<void>;
};

export type DebugHttpPathContext = {
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
  readBody: () => Promise<string>;
};

/**
 * Handles canonical DEBUG_PORT paths: /health, /log/tail, /log/loggers*.
 */
export async function handleDebugHttpPath(
  ctx: DebugHttpPathContext,
  deps: LogDispatchDeps,
): Promise<{ status: number; body: unknown } | null> {
  const { method, pathname, searchParams, readBody } = ctx;
  const { loggerRegistry, logRing, beforeRegistryAccess } = deps;

  if (method === "GET" && (pathname === "/health" || pathname === "/healthz")) {
    return { status: 200, body: { status: "ok" } };
  }

  if (method === "GET" && pathname === "/log/tail") {
    const n = parseTailN(searchParams.get("n") ?? undefined);
    const q = searchParams.get("q") ?? undefined;
    return { status: 200, body: getLogTail(logRing, n, q) };
  }

  if (method === "GET" && pathname === "/log/loggers") {
    try {
      await beforeRegistryAccess?.();
      return { status: 200, body: listLoggerLevels(loggerRegistry) };
    } catch (err) {
      return {
        status: 500,
        body: { error: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  const loggerMatch = /^\/log\/loggers\/(.+)$/.exec(pathname);
  const loggerId = loggerMatch?.[1];
  if (loggerId != null) {
    const id = decodeURIComponent(loggerId);
    try {
      await beforeRegistryAccess?.();
      if (method === "GET") {
        return { status: 200, body: getLoggerLevel(loggerRegistry, id) };
      }
      if (method === "PUT") {
        const raw = await readBody();
        let body: unknown = null;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          return { status: 400, body: { error: "body must be valid JSON" } };
        }
        const parsed = parseLevelBody(body);
        if (parsed.error || !parsed.level) {
          return { status: 400, body: { error: parsed.error ?? "invalid level" } };
        }
        return {
          status: 200,
          body: updateLoggerLevel(loggerRegistry, id, parsed.level as Level),
        };
      }
      if (method === "DELETE") {
        return { status: 200, body: unsetLoggerLevel(loggerRegistry, id) };
      }
    } catch (err) {
      return {
        status: 500,
        body: { error: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  return null;
}

export type NextSlugRouteContext = {
  method: string;
  slug: string[] | undefined;
  searchParams: URLSearchParams;
  jsonBody: () => Promise<unknown>;
};

export type LogAllowedDeps = {
  isAllowed: () => boolean | Promise<boolean>;
};

/**
 * POST client log lines into the in-process ring (garage ingest; no /log path).
 */
export async function handleNextLogIngestRequest(
  ctx: { jsonBody: () => Promise<unknown> },
  deps: LogDispatchDeps & LogAllowedDeps,
): Promise<{ status: number; body: unknown }> {
  if (!(await deps.isAllowed())) {
    return { status: 404, body: { error: "not found" } };
  }

  let body: unknown;
  try {
    body = await ctx.jsonBody();
  } catch {
    return { status: 400, body: { error: "body must be valid JSON" } };
  }
  const parsed = parseLogIngestBody(body);
  if ("error" in parsed) {
    return { status: 400, body: { error: parsed.error } };
  }
  return {
    status: 200,
    body: ingestClientLogLines(deps.logRing as RingBuffer<LogLineWithSource>, parsed.lines),
  };
}

/**
 * App Router control slugs must start with `log` (e.g. `log/tail`, `log/loggers/id`).
 */
export async function handleNextLogControlSlug(
  ctx: NextSlugRouteContext,
  deps: LogDispatchDeps & LogAllowedDeps,
): Promise<{ status: number; body: unknown }> {
  if (!(await deps.isAllowed())) {
    return { status: 404, body: { error: "not found" } };
  }

  if (ctx.method === "POST") {
    return { status: 404, body: { error: "not found" } };
  }

  const slug = ctx.slug ?? [];
  if (slug[0] !== "log") {
    return { status: 404, body: { error: "not found" } };
  }

  const { loggerRegistry, logRing, beforeRegistryAccess } = deps;

  if (ctx.method === "GET" && slug.length === 2 && slug[1] === "tail") {
    const n = parseTailN(ctx.searchParams.get("n") ?? undefined);
    const q = ctx.searchParams.get("q") ?? undefined;
    return { status: 200, body: getLogTail(logRing, n, q) };
  }

  if (ctx.method === "GET" && slug.length === 2 && slug[1] === "loggers") {
    await beforeRegistryAccess?.();
    return { status: 200, body: listLoggerLevels(loggerRegistry) };
  }

  if (slug.length === 3 && slug[1] === "loggers" && slug[2] != null) {
    const id = decodeURIComponent(slug[2]);
    await beforeRegistryAccess?.();
    if (ctx.method === "GET") {
      return { status: 200, body: getLoggerLevel(loggerRegistry, id) };
    }
    if (ctx.method === "PUT") {
      let body: unknown;
      try {
        body = await ctx.jsonBody();
      } catch {
        return { status: 400, body: { error: "body must be valid JSON" } };
      }
      const parsed = parseLevelBody(body);
      if (parsed.error || !parsed.level) {
        return { status: 400, body: { error: parsed.error ?? "invalid level" } };
      }
      return {
        status: 200,
        body: updateLoggerLevel(loggerRegistry, id, parsed.level as Level),
      };
    }
    if (ctx.method === "DELETE") {
      return { status: 200, body: unsetLoggerLevel(loggerRegistry, id) };
    }
  }

  return { status: 404, body: { error: "not found" } };
}

export { readRequestBody };
