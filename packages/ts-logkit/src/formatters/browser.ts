import { Event, Formatter, FormattedOutput, Level } from "../types";

const browserColors: Record<Level, string> = {
  trace: "color: gray",
  debug: "color: cyan",
  info: "color: green",
  warn: "color: orange",
  error: "color: red",
  fatal: "color: white; background-color: red; font-weight: bold",
};

export function formatBrowser(event: Event): [string, string, ...unknown[]] {
  const style = browserColors[event.level] || "";
  const time = new Date(event.timestamp).toISOString();
  const levelLabel = event.level.toUpperCase();

  const parts: unknown[] = [
    `%c[${levelLabel}] ${time} ${event.message}`,
    style,
  ];

  if (event.context) {
    parts.push(event.context);
  }

  if (event.error) {
    parts.push(event.error);
  }

  return parts as [string, string, ...unknown[]];
}

/**
 * Browser formatter for browser environments
 * Uses CSS styling via %c format specifier
 */
export class BrowserFormatter implements Formatter {
  format(event: Event): FormattedOutput {
    return formatBrowser(event);
  }
}
