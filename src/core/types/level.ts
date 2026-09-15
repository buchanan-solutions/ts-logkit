export type Level = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Configured pin on a logger: a concrete severity, or NOTSET (inherit ancestors).
 * Kept separate from `Level` so `LEVELS` stays severities only — no OFF.
 */
export type ConfiguredLevel = Level | "notset";

export const NOTSET = "notset" as const;

/**
 * Order of levels from least to most severe
 */
export const LEVELS: Level[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
];

/**
 * Builds ancestor id chain from most specific to root.
 * Built so effective-level walks can hop dotted ids without live parent objects.
 * @example ancestorIds('a.b.c') → ['a.b.c', 'a.b', 'a']
 */
export function ancestorIds(id: string): string[] {
  const parts = id.split(".").filter(Boolean);
  if (parts.length === 0) return [];
  return parts.map((_, i) => parts.slice(0, parts.length - i).join("."));
}
