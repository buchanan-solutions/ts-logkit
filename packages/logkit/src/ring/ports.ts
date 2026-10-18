const DEFAULT_DEBUG_PORT = 6060;

/**
 * Parses DEBUG_PORT (or override env key) with fallback 6060.
 */
export function resolveDebugPort(
  env: NodeJS.ProcessEnv = process.env,
  envKey = "DEBUG_PORT",
  fallback = DEFAULT_DEBUG_PORT,
): number {
  const raw = env[envKey];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return fallback;
  return Math.floor(n);
}
