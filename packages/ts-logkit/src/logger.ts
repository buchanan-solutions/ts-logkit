// ./packages/ts-logkit/src/logger.ts
import { Event, Level } from "./types";
import { Transport } from "./types/transport";
import { Hook } from "./types/hook";
import { Formatter } from "./types/formatter";
import { Config } from "./types/config";
import { Store } from "./types/store";
import { splitError } from "./utils/splitError";
import Global from "./global";
import { LEVELS } from "./types/level";

export class Logger {
  private _id: string;
  private _minLevel: Level;
  private _transports: Transport[];
  private _formatter: Formatter;
  private _hooks?: Hook[];
  private _type?: string;
  private _unsubscribe?: () => void;

  constructor(opts: Config, store?: Store) {
    this._id = opts.id;
    this._transports = opts.transports;
    this._formatter = opts.formatter;
    this._hooks = opts.hooks;
    this._minLevel = opts.level ?? "warn";
    this._type = opts.type;

    if (store) {
      // Apply initial override from store
      void this.applyStoreConfig(store);

      // Subscribe for updates if store supports subscriptions
      if (store.subscribe) {
        this._unsubscribe = store.subscribe(this._id, (config) => {
          // Only apply level from store - transports, formatter, hooks are runtime-only
          if (config.level !== undefined) {
            this._minLevel = config.level;
          }
        });
      }
    }
  }

  /**
   * Apply configuration from store (async)
   * Store only contains serializable data (level), not runtime objects
   */
  private async applyStoreConfig(store: Store): Promise<void> {
    try {
      const config = await store.get(this._id);
      // Only apply level from store - transports, formatter, hooks are runtime-only
      if (config.level !== undefined) {
        this._minLevel = config.level;
      }
    } catch (error) {
      // Logger not found in store, use defaults - this is fine
      // Silently ignore to prevent breaking logging
    }
  }

  /**
   * Clean up subscriptions when logger is no longer needed
   */
  destroy(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
  }

  private shouldLog(level: Level) {
    const loggerIndex = LEVELS.indexOf(level);
    const minLoggerIndex = LEVELS.indexOf(this._minLevel);
    const globalLevel = Global.getLogLevel();
    const minGlobalIndex = LEVELS.indexOf(globalLevel);

    // Only log if level >= both logger minLevel AND global minLevel
    // Both conditions must be true - check each explicitly
    const passesLoggerLevel = loggerIndex >= minLoggerIndex;
    const passesGlobalLevel = loggerIndex >= minGlobalIndex;
    return passesLoggerLevel && passesGlobalLevel;
  }

  private async emit(event: Event) {
    if (!Global.isLoggingEnabled()) return;
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
