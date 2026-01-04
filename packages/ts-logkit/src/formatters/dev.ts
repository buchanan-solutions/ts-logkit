import { Event, Formatter, FormattedOutput } from "../types";

const COLORS = {
  trace: "\x1b[90m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  fatal: "\x1b[41m",
};

const RESET = "\x1b[0m";

export function formatDev(event: Event): string {
  const color = COLORS[event.level];
  const time = new Date(event.timestamp).toISOString();

  return (
    `${color}[${event.level.toUpperCase()}]${RESET} ` +
    `${time} ${event.message}` +
    (event.context ? ` ${JSON.stringify(event.context)}` : "") +
    (event.error ? `\n${event.error.stack}` : "")
  );
}

/**
 * Development formatter for Node.js environments
 * Uses ANSI color codes for terminal output
 */
export class DevFormatter implements Formatter {
  format(event: Event): FormattedOutput {
    return formatDev(event);
  }
}
