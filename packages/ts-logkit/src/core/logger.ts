// ./packages/ts-logkit/src/core/logger.ts
import { Event, Level } from "./types";
import { Transport } from "./types/transport";
import { Hook } from "./types/hook";
import { Formatter } from "./types/formatter";
import { Config } from "./types/config";
import { splitError } from "./utils/splitError";
import { Global } from "./global";
import { LEVELS } from "./types/level";
import { LoggerFactory } from "./factory";
import { validateLevelAndWarn } from "./utils/validateLevel";
import { LoggerLike } from "./types/loggerLike";

export class Logger {
  private _id: string;
  private _minLevel: Level;
  private _transports: Transport[];
  private _formatter: Formatter;
  private _hooks?: Hook[];
  private _type?: string;
  private _factory?: LoggerFactory;

  constructor(opts: Config) {
    this._id = opts.id;
    this._transports = opts.transports;
    this._formatter = opts.formatter;
    this._hooks = opts.hooks;
    this._minLevel = opts.level ?? "warn";
    this._type = opts.type;
    this._factory = opts.factory;
  }

  get id(): string {
    return this._id;
  }

  get factory(): LoggerFactory | undefined {
    return this._factory;
  }

  public set factory(factory: LoggerFactory) {
    this._factory = factory;
  }

  public get level(): Level {
    return this._minLevel;
  }

  setLevel(level: Level) {
    validateLevelAndWarn(level, {
      qualifier: "Logger.level",
      onSuccess: () => {
        this._minLevel = level;
      },
      onFailure: () => {
        return;
      },
    });
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

    // 1. Level Check (Against both local and global)
    if (!this.shouldLog(event.level)) return;

    // 2. Transports
    for (const transport of this._transports) {
      transport.log(event, this._formatter);
    }

    // 3. Hooks (Fire and forget, don't await)
    if (this._hooks) {
      for (const hook of this._hooks) {
        const result = hook.onLog(event);
        if (result instanceof Promise) {
          result.catch((err) => console.error("Hook error:", err));
        }
      }
    }
  }

  /**
   * Create a child logger with a hierarchical ID.
   * Child inherits parent's transports, formatter, hooks, and minLevel by default.
   */
  child(childId: string, opts?: Partial<Config>): Logger {
    const fullId = `${this._id}.${childId}`;

    const newConfig = {
      id: fullId,
      transports: opts?.transports ?? this._transports,
      formatter: opts?.formatter ?? this._formatter,
      hooks: opts?.hooks ?? this._hooks,
      level: opts?.level ?? this._minLevel,
      type: opts?.type ?? this._type,
    };

    let newLogger: LoggerLike;
    if (this._factory) {
      newLogger = this._factory.createLogger(fullId, newConfig);
    } else {
      newLogger = new Logger(newConfig);
    }

    return newLogger as Logger;
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
