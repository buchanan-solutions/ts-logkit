import http from "node:http";

import type { LoggerLike } from "../../index";

import { handleDebugHttpPath, type LogDispatchDeps, readRequestBody } from "../dispatch.ts";
import { normalizeMount, pathnameUnderMount } from "../mount.ts";
import { resolveDebugPort } from "../ports.ts";

export type EnsureDebugHttpServerOptions = LogDispatchDeps & {
  rootLog?: LoggerLike;
  debugPort?: number;
  /** Contract mount on this listener (default `/`). */
  mount?: string;
  globalKey?: string;
};

type GlobalWithDebugHttp = typeof globalThis & {
  [key: string]: http.Server | undefined;
};

function writeJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/**
 * Starts private DEBUG_PORT listener (singleton on globalThis).
 */
export function ensureDebugHttpServer(options: EnsureDebugHttpServerOptions): http.Server {
  const globalKey = options.globalKey ?? "__coreMfgDebugHttpServer";
  const g = globalThis as GlobalWithDebugHttp;
  const existing = g[globalKey];
  if (existing) return existing;

  const port = options.debugPort ?? resolveDebugPort();
  const mount = normalizeMount(options.mount ?? "/");
  const log = options.rootLog?.child("debug-http");

  const server = http.createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const relative = pathnameUnderMount(url.pathname, mount);
      if (relative == null) {
        writeJson(res, 404, { error: "not found" });
        return;
      }
      const result = await handleDebugHttpPath(
        {
          method: req.method ?? "GET",
          pathname: relative,
          searchParams: url.searchParams,
          readBody: () => readRequestBody(req),
        },
        options,
      );
      if (result == null) {
        writeJson(res, 404, { error: "not found" });
        return;
      }
      writeJson(res, result.status, result.body);
    })().catch((err: unknown) => {
      writeJson(res, 500, {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  });

  g[globalKey] = server;

  server.once("error", (err: NodeJS.ErrnoException) => {
    if (g[globalKey] === server) {
      g[globalKey] = undefined;
    }
    log?.error(`listen :${port} failed`, { error: err.message });
  });

  server.listen(port, "0.0.0.0", () => {
    const mountLabel = mount === "/" ? "" : mount;
    log?.info(
      `listening on 0.0.0.0:${port} (GET ${mountLabel}/health, ${mountLabel}/loggers, ${mountLabel}/tail)`,
    );
  });

  return server;
}
