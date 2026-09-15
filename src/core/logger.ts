import { type Event, type Level, type ConfiguredLevel, NOTSET, LEVELS } from "./types";
import { type Transport } from "./types/transport";
import { type Hook } from "./types/hook";
import { type Formatter } from "./types/formatter";
import { type Config } from "./types/config";
import { splitError } from "./utils/splitError";
import { Global } from "./global";
import { type LoggerFactory } from "./factory";
import { validateLevelAndWarn } from "./utils/validateLevel";
import { type LoggerLike } from "./types/loggerLike";

export class Logger {
  private _id: string;
  private _configuredLevel: ConfiguredLevel;
  private _fallbackLevel: Level;
  private _transports: Transport[];
  private _formatter: Formatter;
  private _hooks?: Hook[];
  private _type?: string;
  private _factory?: LoggerFactory;
  private _parent?: Logger;

  constructor(opts: Config) {
    this._id = opts.id;
    this._transports = opts.transports;
    this._formatter = opts.formatter;
    this._hooks = opts.hooks;
    this._configuredLevel = opts.level ?? NOTSET;
    this._fallbackLevel = opts.fallbackLevel ?? opts.level ?? "warn";
    this._type = opts.type;
    this._factory = opts.factory;
    this._parent = opts.parent;
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

  /**
   * Effective severity used for filtering — walks NOTSET ancestors.
   * Kept as `.level` so existing readers (useLogger / modals) stay safe.
   */
  public get level(): Level {
    return this.getEffectiveLevel();
  }

  /** Pin vs inherit: concrete severity or `'notset'`. */
  public get configuredLevel(): ConfiguredLevel {
    return this._configuredLevel;
  }

  /**
   * Resolves effective severity without touching the Store.
   * Registry path: dotted id + cache/live. No-registry: parent pointers.
   */
  getEffectiveLevel(): Level {
    const registry = this._factory?.registry;
    if (registry) {
      return registry.getEffectiveLevel(this._id);
    }

    if (this._configuredLevel !== NOTSET) {
      return this._configuredLevel;
    }
    if (this._parent) {
      return this._parent.getEffectiveLevel();
    }
    return this._factory?.defaultLevel ?? this._fallbackLevel;
  }

  /**
   * Pins an explicit severity on this logger only (no cascade).
   */
  setLevel(level: Level) {
    validateLevelAndWarn(level, {
      qualifier: "Logger.setLevel",
      onSuccess: () => {
        this._configuredLevel = level;
      },
      onFailure: () => {
        return;
      },
    });
  }

  /**
   * Clears the pin so this logger inherits again (configured NOTSET).
   */
  clearLevel(): void {
    this._configuredLevel = NOTSET;
  }

  private shouldLog(level: Level) {
    const loggerIndex = LEVELS.indexOf(level);
    const minLoggerIndex = LEVELS.indexOf(this.getEffectiveLevel());
    const minGlobalIndex = LEVELS.indexOf(Global.level);

    const passesLoggerLevel = loggerIndex >= minLoggerIndex;
    const passesGlobalLevel = loggerIndex >= minGlobalIndex;
    return passesLoggerLevel && passesGlobalLevel;
  }

  private async emit(event: Event) {
    if (!Global.enabled) return;

    if (!this.shouldLog(event.level)) return;

    for (const transport of this._transports) {
      transport.log(event, this._formatter);
    }

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
   * Create a child logger with hierarchical id `parent.childId`.
   * Shares transports/formatter/hooks; configured level defaults to NOTSET (inherit).
   * Pass `opts.level` to pin an explicit severity on the child.
   */
  child(childId: string, opts?: Partial<Config>): Logger {
    const fullId = `${this._id}.${childId}`;

    const newConfig: Config = {
      id: fullId,
      transports: opts?.transports ?? this._transports,
      formatter: opts?.formatter ?? this._formatter,
      hooks: opts?.hooks ?? this._hooks,
      type: opts?.type ?? this._type,
      fallbackLevel: this._fallbackLevel,
      factory: this._factory,
      parent: this._factory?.registry ? undefined : this,
    };
    if (opts?.level !== undefined) {
      newConfig.level = opts.level;
    }

    let newLogger: LoggerLike;
    if (this._factory) {
      newLogger = this._factory.createLogger(fullId, {
        transports: newConfig.transports,
        formatter: newConfig.formatter,
        hooks: newConfig.hooks,
        type: newConfig.type,
        level: opts?.level,
        parent: newConfig.parent,
        fallbackLevel: newConfig.fallbackLevel,
      });
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
