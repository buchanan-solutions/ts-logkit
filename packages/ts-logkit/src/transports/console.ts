// src/transports/console.ts
import { Transport, Event, Formatter, FormattedOutput } from "../types";

/**
 * Determines the appropriate console method based on the event level
 */
function getConsoleMethod(level: Event["level"]): (...args: unknown[]) => void {
  switch (level) {
    case "fatal":
    case "error":
      return console.error.bind(console);
    case "warn":
      return console.warn.bind(console);
    case "info":
      return console.info.bind(console);
    case "trace":
      return console.trace.bind(console);
    case "debug":
    default:
      return console.log.bind(console);
  }
}

/**
 * Creates a console transport that outputs formatted logs to the console
 * Works in both browser and Node.js environments
 * Automatically selects the appropriate console method based on log level
 *
 * @param formatter - Optional formatter to use for formatting events before logging.
 *                    Defaults to AutoFormatter which auto-detects browser vs Node.js environment.
 */
export function createConsoleTransport(): Transport {
  return {
    log(event: Event, formatter?: Formatter) {
      // Format the event using the provided formatter
      const formatted: FormattedOutput = formatter?.format(event) ?? [
        event.message,
        event.context,
      ];

      // Get the appropriate console method based on event level
      const consoleMethod = getConsoleMethod(event.level);

      if (Array.isArray(formatted)) {
        consoleMethod(...formatted);
      } else {
        consoleMethod(formatted);
      }
    },
  };
}
