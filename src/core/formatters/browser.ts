import { Event, Formatter, FormattedOutput, Level } from "../types";

export const BROWSER_COLORS: Record<Level, string> = {
  trace: "color: gray",
  debug: "color: cyan",
  info: "color: green",
  warn: "color: orange",
  error: "color: red",
  fatal: "color: white; background-color: red; font-weight: bold",
};

const LOGGER_ID_STYLE = "font-style: italic; color: gray";
const RESET_STYLE = "";

export function formatBrowser(event: Event): FormattedOutput {
  const levelStyle = BROWSER_COLORS[event.level];
  const levelLabel = ("[" + event.level.toUpperCase() + "]").padEnd(7);

  // This check will warn if the code isn't running in a browser (i.e., window is undefined), which is generally correct for detecting a Node.js environment.
  // However, not all non-browser JS environments are Node.js, and some tools may polyfill window.
  // If you specifically want to detect Node.js, you could add an additional check:
  if (typeof window === "undefined" && typeof process !== "undefined" && process.versions && process.versions.node) {
    console.warn("Using browser formatter in a Node.js environment; output will not be styled.");
  }

  const parts: unknown[] = [
    `%c${levelLabel}%c %c${event.logger_id}%c \t${event.message}`,
    levelStyle,
    RESET_STYLE,
    LOGGER_ID_STYLE,
    RESET_STYLE,
    ...(event.args ?? []),
    ...(event.error ? [event.error] : []),
  ];

  return parts as [string, ...unknown[]];
}

/**
 * Browser formatter using console %c styling.
 * Same layout as defaultFormatter — level, logger id, message — with CSS colors.
 */
export const browserFormatter: Formatter = {
  format: formatBrowser,
};
