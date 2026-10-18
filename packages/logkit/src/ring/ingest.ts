import { LEVELS, type Level } from "../index";

import { type LogLine, type RingBuffer, serializeArgs } from "./ring-buffer.ts";

export const MAX_INGEST_LINES = 100;

/** Ring line with origin for mixed client/server tails. */
export type LogLineWithSource = LogLine & { source?: "client" | "server" };

export type LogIngestParseOk = { lines: LogLineWithSource[] };
export type LogIngestParseErr = { error: string };

/**
 * Parses POST ingest `{ lines }`; stamps source=client (ignores client-supplied source).
 */
export function parseLogIngestBody(body: unknown): LogIngestParseOk | LogIngestParseErr {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { error: "body must be a JSON object" };
  }
  const rawLines = (body as { lines?: unknown }).lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return { error: "lines must be a non-empty array" };
  }
  if (rawLines.length > MAX_INGEST_LINES) {
    return { error: `lines must have at most ${MAX_INGEST_LINES} items` };
  }

  const lines: LogLineWithSource[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const parsed = parseIngestLine(rawLines[i], i);
    if ("error" in parsed) return parsed;
    lines.push(parsed.line);
  }
  return { lines };
}

export function ingestClientLogLines(
  ring: RingBuffer<LogLineWithSource>,
  lines: LogLineWithSource[],
): {
  accepted: number;
  size: number;
  capacity: number;
} {
  for (const line of lines) {
    ring.push({ ...line, source: "client" });
  }
  return { accepted: lines.length, size: ring.size, capacity: ring.capacity };
}

function parseIngestLine(
  raw: unknown,
  index: number,
): { line: LogLineWithSource } | LogIngestParseErr {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: `lines[${index}] must be an object` };
  }
  const row = raw as Record<string, unknown>;
  if (typeof row.logger_id !== "string" || row.logger_id.trim() === "") {
    return { error: `lines[${index}].logger_id must be a non-empty string` };
  }
  if (typeof row.message !== "string") {
    return { error: `lines[${index}].message must be a string` };
  }
  if (typeof row.level !== "string") {
    return { error: `lines[${index}].level must be a string` };
  }
  const level = row.level.toLowerCase();
  if (!(LEVELS as readonly string[]).includes(level)) {
    return { error: `lines[${index}].level must be one of: ${LEVELS.join(", ")}` };
  }
  const ts = Number(row.ts);
  if (!Number.isFinite(ts)) {
    return { error: `lines[${index}].ts must be a number` };
  }

  const line: LogLineWithSource = {
    ts,
    logger_id: row.logger_id,
    level: level as Level,
    message: row.message,
    source: "client",
  };

  const args = serializeArgs(Array.isArray(row.args) ? row.args : undefined);
  if (args) line.args = args;

  if (row.error != null) {
    const err = parseIngestError(row.error, index);
    if ("error" in err) return err;
    line.error = err.value;
  }

  return { line };
}

function parseIngestError(
  raw: unknown,
  index: number,
): { value: NonNullable<LogLine["error"]> } | LogIngestParseErr {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: `lines[${index}].error must be an object` };
  }
  const err = raw as Record<string, unknown>;
  if (typeof err.name !== "string" || typeof err.message !== "string") {
    return { error: `lines[${index}].error.name and .message must be strings` };
  }
  const value: NonNullable<LogLine["error"]> = {
    name: err.name,
    message: err.message,
  };
  if (typeof err.stack === "string") value.stack = err.stack;
  return { value };
}
