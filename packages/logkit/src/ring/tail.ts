import type { LogLine, RingBuffer } from "./ring-buffer.ts";

export const DEFAULT_TAIL_N = 100;
export const MAX_TAIL_N = 500;

export type LogTailResult = {
  n: number;
  q?: string;
  capacity: number;
  size: number;
  lines: LogLine[];
};

/**
 * Parses `?n=` for tail; clamps to [1, MAX_TAIL_N].
 */
export function parseTailN(raw: string | undefined): number {
  if (raw == null || raw === "") return DEFAULT_TAIL_N;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_TAIL_N;
  return Math.min(Math.floor(n), MAX_TAIL_N);
}

/**
 * Grep-style filter over tail lines (case-insensitive JSON text).
 */
export function filterLogLines(lines: LogLine[], q: string | undefined): LogLine[] {
  const needle = q?.trim().toLowerCase();
  if (needle == null || needle === "") return lines;
  return lines.filter((line) => JSON.stringify(line).toLowerCase().includes(needle));
}

/**
 * Newest `n` ring lines, then optional `q` filter. Oldest→newest.
 */
export function getLogTail(ring: RingBuffer<LogLine>, n: number, q?: string): LogTailResult {
  const newest = ring.tail(n);
  return {
    n,
    ...(q != null && q !== "" ? { q } : {}),
    capacity: ring.capacity,
    size: ring.size,
    lines: filterLogLines(newest, q),
  };
}
