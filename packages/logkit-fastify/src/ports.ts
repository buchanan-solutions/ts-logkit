/**
 * Port convention for Core HTTP services:
 * - `PORT` — product / public API
 * - `DEBUG_PORT` — private debug / log listener (default 6060)
 */

/**
 * Parses a positive integer port from env, or returns `fallback`.
 */
export function parsePortEnv(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return fallback;
  return Math.floor(n);
}

/**
 * Public/product listen port (`PORT`).
 */
export function resolveMainPort(fallback: number): number {
  return parsePortEnv(process.env.PORT, fallback);
}

/**
 * Debug / log listen port (`DEBUG_PORT`, default 6060).
 */
export function resolveDebugPort(fallback = 6060): number {
  return parsePortEnv(process.env.DEBUG_PORT, fallback);
}
