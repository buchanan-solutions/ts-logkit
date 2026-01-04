// ./packages/ts-logkit/src/logger.ts
import { Event, Level } from "./types";
import { Transport } from "./types/transport";
import { Hook } from "./types/hook";
import { Formatter } from "./types/formatter";
import { Config } from "./types/config";

const LEVEL_ORDER: Level[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
];

export class Logger {
  private _id: string;
  private _minLevel: Level;
  private _transports: Transport[];
  private _formatter: Formatter;
  private _hooks?: Hook[];

  constructor(opts: Config) {
    this._id = opts.id;
    this._transports = opts.transports;
    this._formatter = opts.formatter;
    this._hooks = opts.hooks;
    this._minLevel = opts.level ?? "warn";
  }

  private shouldLog(level: Level) {
    return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(this._minLevel);
  }

  private async emit(event: Event) {
    if (!this.shouldLog(event.level)) return;

    // Send the full event to all transports
    // Transports can format it themselves or use their own formatters
    for (const transport of this._transports) {
      transport.log(event, this._formatter);
    }

    // Execute hooks with the original event (hooks may need raw event data)
    // Support both sync and async hooks
    if (this._hooks) {
      for (const hook of this._hooks) {
        const result = hook.onLog(event);
        // If hook returns a promise, await it (but don't block other hooks)
        if (result instanceof Promise) {
          result.catch((err) => {
            // Silently handle hook errors to prevent breaking logging
            console.error("Hook error:", err);
          });
        }
      }
    }
  }

  trace(msg: string, ctx?: Record<string, unknown>) {
    void this.emit({
      level: "trace",
      message: msg,
      context: ctx,
      timestamp: Date.now(),
    });
  }
  debug(msg: string, ctx?: Record<string, unknown>) {
    void this.emit({
      level: "debug",
      message: msg,
      context: ctx,
      timestamp: Date.now(),
    });
  }
  info(msg: string, ctx?: Record<string, unknown>) {
    void this.emit({
      level: "info",
      message: msg,
      context: ctx,
      timestamp: Date.now(),
    });
  }
  warn(msg: string, ctx?: Record<string, unknown>) {
    void this.emit({
      level: "warn",
      message: msg,
      context: ctx,
      timestamp: Date.now(),
    });
  }
  error(msg: string, err?: Error, ctx?: Record<string, unknown>) {
    void this.emit({
      level: "error",
      message: msg,
      error: err,
      context: ctx,
      timestamp: Date.now(),
    });
  }
  fatal(msg: string, err?: Error, ctx?: Record<string, unknown>) {
    void this.emit({
      level: "fatal",
      message: msg,
      error: err,
      context: ctx,
      timestamp: Date.now(),
    });
  }
}
