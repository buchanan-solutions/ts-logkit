// ./packages/ts-logkit/src/logger.ts
import { Event, Level } from "./types";
import { Transport } from "./types/transport";
import { Hook } from "./types/hook";
import { Formatter } from "./types/formatter";
import { Config } from "./types/config";
import { splitError } from "./utils/splitError";
import { Global } from "./global";
import { LEVELS } from "./types/level";

export class Logger {
  private _id: string;
  private _minLevel: Level;
  private _transports: Transport[];
  private _formatter: Formatter;
  private _hooks?: Hook[];
  private _type?: string;

  constructor(opts: Config) {
    this._id = opts.id;
    this._transports = opts.transports;
    this._formatter = opts.formatter;
    this._hooks = opts.hooks;
    this._minLevel = opts.level ?? "warn";
    this._type = opts.type;
  }

  get id(): string {
    return this._id;
  }

  public setLevel(level: Level): void {
    this._minLevel = level;
  }

  private shouldLog(level: Level) {
    const loggerIndex = LEVELS.indexOf(level);
    const minLoggerIndex = LEVELS.indexOf(this._minLevel);
    const minGlobalIndex = LEVELS.indexOf(Global.level);

    // Only log if level >= both logger minLevel AND global minLevel
    // Both conditions must be true - check each explicitly
    const passesLoggerLevel = loggerIndex >= minLoggerIndex;
    const passesGlobalLevel = loggerIndex >= minGlobalIndex;
    return passesLoggerLevel && passesGlobalLevel;
  }

  private async emit(event: Event) {
    if (!Global.enabled) return;
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

  trace(message: string, ...args: unknown[]) {
    const { args: filteredArgs, error } = splitError(args);
    void this.emit({
      logger_id: this._id,
      level: "trace",
      message,
      args: filteredArgs,
      error,
      timestamp: Date.now(),
    });
  }
  debug(message: string, ...args: unknown[]) {
    const { args: filteredArgs, error } = splitError(args);
    void this.emit({
      logger_id: this._id,
      level: "debug",
      message,
      args: filteredArgs,
      error,
      timestamp: Date.now(),
    });
  }
  info(message: string, ...args: unknown[]) {
    const { args: filteredArgs, error } = splitError(args);
    void this.emit({
      logger_id: this._id,
      level: "info",
      message,
      args: filteredArgs,
      error,
      timestamp: Date.now(),
    });
  }
  warn(message: string, ...args: unknown[]) {
    const { args: filteredArgs, error } = splitError(args);
    void this.emit({
      logger_id: this._id,
      level: "warn",
      message,
      args: filteredArgs,
      error,
      timestamp: Date.now(),
    });
  }
  error(message: string, ...args: unknown[]) {
    const { args: filteredArgs, error } = splitError(args);
    void this.emit({
      logger_id: this._id,
      level: "error",
      message,
      args: filteredArgs,
      error,
      timestamp: Date.now(),
    });
  }
  fatal(message: string, ...args: unknown[]) {
    const { args: filteredArgs, error } = splitError(args);
    void this.emit({
      logger_id: this._id,
      level: "fatal",
      message,
      args: filteredArgs,
      error,
      timestamp: Date.now(),
    });
  }
}
