import { Event, Formatter, FormattedOutput } from "../types";

const ANSI_COLORS = {
  trace: "\x1b[90m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[41m",
};

const RESET = "\x1b[0m";

export function formatDev(event: Event): FormattedOutput {
  const color = ANSI_COLORS[event.level];
  // const time = new Date(event.timestamp).toISOString();
  const levelLabel = event.level.toUpperCase();

  const isClient = typeof window !== "undefined";

  const parts: unknown[] = [
    `(${isClient ? "~" : ""}${
      event.logger_id
    }) ${color}[${levelLabel}]${RESET} \t${event.message}`,
    ...(event.args ?? []),
    ...(event.error ? [event.error] : []),
  ];

  return parts as [string, ...unknown[]];
}

/**
 * Development formatter for Node.js environments
 * Uses ANSI color codes for terminal output
 */
export const devFormatter: Formatter = {
  format: formatDev,
};
