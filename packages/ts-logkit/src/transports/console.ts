import { LogTransport, LogEvent } from "../types";
import { formatDev } from "../formatters/dev";

export function createConsoleTransport(): LogTransport {
  return {
    log(event: LogEvent) {
      const output = formatDev(event);

      if (event.level === "error" || event.level === "fatal") {
        console.error(output);
      } else {
        console.log(output);
      }
    },
  };
}
