const DEFAULT_PORT = 6060;

export type ResolveBaseUrlInput = {
  /** Commander `--port`. Wins over `LOG_PORT` and over the port in `LOG_URL`. */
  portFlag?: string;
  env?: NodeJS.ProcessEnv;
};

/**
 * Turns a port string into a TCP port.
 * Built so `--port` and `LOG_PORT` share one check before the CLI calls the listener.
 */
function parsePort(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(`port must be an integer from 1 to 65535 (got ${raw})`);
  }
  return n;
}

import { normalizeDebugBase } from "../ring/mount.ts";

/**
 * Complete mount URL for the private debug listener.
 * Precedence: `--port`, then `LOG_PORT`, then `LOG_URL`, then `http://127.0.0.1:6060` (root mount).
 * A port override rewrites the port of `LOG_URL` while preserving its mount path.
 */
export function resolveBaseUrl(input: ResolveBaseUrlInput = {}): string {
  const env = input.env ?? process.env;
  const explicit = input.portFlag?.trim() || env.LOG_PORT?.trim() || "";
  const urlRaw = env.LOG_URL?.trim();

  if (explicit) {
    const port = parsePort(explicit);
    if (urlRaw) {
      const url = new URL(urlRaw);
      url.port = String(port);
      return normalizeDebugBase(url.href);
    }
    return `http://127.0.0.1:${port}`;
  }

  if (urlRaw) return normalizeDebugBase(urlRaw);
  return `http://127.0.0.1:${DEFAULT_PORT}`;
}
