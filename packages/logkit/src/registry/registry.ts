import { Logger } from "../core/logger";
import { type Store } from "../stores/store";
import {
  type Level,
  type ConfiguredLevel,
  NOTSET,
  ancestorIds,
} from "../core/types/level";
import { validateLevelAndWarn } from "../core/utils/validateLevel";
import { LoggerNotFoundError } from "../core/errors/loggerNotFound";
import type { LoggerLike } from "../core/types/loggerLike";
import type { Config } from "../core/types/config";
import { NoopLogger } from "../core/noop";

/** Inspect row for UIs: configured pin vs resolved effective severity. */
export interface LoggerLevelInfo {
  id: string;
  configured: ConfiguredLevel;
  effective: Level;
}

export class Registry {
  private static _log_level: Level = "warn";

  private _loggers = new Map<string, Logger>();
  private _configCache = new Map<string, Level>();
  private _store?: Store;
  private _unsubscribe?: () => void;
  private _defaultLevel: Level = "warn";

  private _log: LoggerLike;

  static get logLevel(): Level {
    return Registry._log_level;
  }
  static set logLevel(level: Level) {
    validateLevelAndWarn(level, {
      qualifier: "Registry.logLevel",
      onSuccess: () => {
        Registry._log_level = level;
      },
      onFailure: () => {
        return;
      },
    });
  }

  public get store(): Store | undefined {
    return this._store;
  }

  /**
   * Process fallback used when an id's ancestor chain is all NOTSET.
   * Set from the factory default (LOG_LEVEL) so inspect/effective stay coherent.
   */
  get defaultLevel(): Level {
    return this._defaultLevel;
  }
  set defaultLevel(level: Level) {
    this._defaultLevel = level;
  }

  constructor(logConfig?: Config) {
    this._log = logConfig ? new Logger(logConfig) : NoopLogger;
  }

  /**
   * Bootstrap the registry by loading all configurations from the store into a local cache.
   * Must be called before creating loggers that rely on persisted explicit levels.
   */
  async bootstrap(store: Store): Promise<void> {
    this._log.info("Bootstrapping registry from store");

    if (this._unsubscribe) {
      this._log.debug("Cleaning up existing store subscription");
      this._unsubscribe();
    }

    this._store = store;

    const configs = await store.list();
    this._configCache.clear();
    configs.forEach((cfg) => {
      if (cfg.level) {
        this._configCache.set(cfg.id, cfg.level as Level);
      }
    });
    this._log.info(`Loaded ${configs.length} configurations into cache`);

    const activeLoggers = Array.from(this._loggers.values());
    if (activeLoggers.length > 0) {
      this._log.info(
        `Applying cached levels to ${activeLoggers.length} existing loggers...`
      );
      activeLoggers.forEach((logger) => {
        const cachedLevel = this._configCache.get(logger.id);
        if (cachedLevel) {
          logger.setLevel(cachedLevel);
          this._log.debug("Applied cached level to logger", {
            id: logger.id,
            level: cachedLevel,
          });
        }
      });
    }

    if (store.subscribeAll) {
      this._unsubscribe = store.subscribeAll((cfg) => {
        if (cfg.level !== undefined) {
          this._configCache.set(cfg.id, cfg.level as Level);
          const logger = this._loggers.get(cfg.id);
          if (logger && cfg.level !== logger.configuredLevel) {
            this._log.debug("Store reactive update", {
              id: cfg.id,
              level: cfg.level,
            });
            logger.setLevel(cfg.level as Level);
          }
        }
      });
    }
  }

  /**
   * Looks up configured level for an id from live instance or cache only (never Store).
   * Missing → NOTSET.
   */
  lookupConfigured(id: string): ConfiguredLevel {
    const live = this._loggers.get(id);
    if (live) {
      return live.configuredLevel;
    }
    const cached = this._configCache.get(id);
    return cached ?? NOTSET;
  }

  /**
   * Walks dotted ancestors for the first non-NOTSET configured level, else factory default.
   * Sync; must not touch the Store (hot path for shouldLog).
   */
  getEffectiveLevel(id: string): Level {
    for (const ancestor of ancestorIds(id)) {
      const configured = this.lookupConfigured(ancestor);
      if (configured !== NOTSET) {
        return configured;
      }
    }
    return this._defaultLevel;
  }

  /**
   * Register a logger. Hydrates explicit level from cache only.
   * Does not persist NOTSET (or any level) to the store — use `update` for that.
   */
  register(logger: Logger): void {
    this._loggers.set(logger.id, logger);
    this._log.info("Logger registered", { id: logger.id });

    const cachedLevel = this._configCache.get(logger.id);
    if (cachedLevel) {
      logger.setLevel(cachedLevel);
      this._log.debug("Applied cached level to logger", {
        id: logger.id,
        level: cachedLevel,
      });
    }
  }

  /**
   * Pins an explicit severity on exact `id` only (cache + live + store). No cascade.
   * @throws {Error} If no store is attached
   */
  update(id: string, level: Level) {
    this._log.info("Updating logger configuration", {
      loggerId: id,
      newLevel: level,
    });
    if (!this._store) {
      this._log.error("Cannot update logger: no store attached", {
        loggerId: id,
      });
      throw new Error("Registry has no store attached");
    }

    validateLevelAndWarn(level, {
      qualifier: "Registry.update",
      onSuccess: () => {
        this._configCache.set(id, level);

        const logger = this._loggers.get(id);
        if (logger) {
          const previousConfigured = logger.configuredLevel;
          logger.setLevel(level);
          this._log.debug("Updated logger level", {
            loggerId: id,
            level,
            previousConfigured,
          });
        }

        void this._store!.set({ id, level });
      },
      onFailure: () => {
        return;
      },
    });
  }

  /**
   * Clears the pin for `id` → NOTSET, drops cache entry, removes store row.
   * Descendants that were NOTSET resume walking to the next ancestor.
   * @throws {Error} If no store is attached
   */
  unset(id: string): void {
    this._log.info("Unsetting logger configuration", { loggerId: id });
    if (!this._store) {
      this._log.error("Cannot unset logger: no store attached", {
        loggerId: id,
      });
      throw new Error("Registry has no store attached");
    }

    this._configCache.delete(id);

    const logger = this._loggers.get(id);
    if (logger) {
      logger.clearLevel();
    }

    const store = this._store;
    void (async () => {
      if (typeof store.delete === "function") {
        await store.delete(id);
        return;
      }
      const remaining = (await store.list()).filter((c) => c.id !== id);
      await store.setAll(remaining);
    })();
  }

  /**
   * Union of registered loggers and store/cache ids with configured + effective.
   */
  listLevels(): LoggerLevelInfo[] {
    const ids = new Set<string>([
      ...this._loggers.keys(),
      ...this._configCache.keys(),
    ]);
    return Array.from(ids)
      .sort()
      .map((id) => ({
        id,
        configured: this.lookupConfigured(id),
        effective: this.getEffectiveLevel(id),
      }));
  }

  /**
   * Unregister a logger from the registry (instance map only — does not unset store).
   */
  unregister(id: string): void {
    const existed = this._loggers.has(id);
    this._loggers.delete(id);
    if (existed) {
      this._log.debug("Logger unregistered from registry", { loggerId: id });
    } else {
      this._log.debug("Attempted to unregister non-existent logger", {
        loggerId: id,
      });
    }
  }

  /**
   * Check if a logger with the given ID is registered
   */
  has(id: string): boolean {
    return this._loggers.has(id);
  }

  get(id: string): Logger {
    this._log.debug("Getting logger from registry", { loggerId: id });
    const logger = this._loggers.get(id);
    if (!logger) {
      this._log.warn("Logger not found in registry, throwing error", {
        loggerId: id,
      });
      throw new LoggerNotFoundError(id);
    }
    this._log.debug("Logger retrieved successfully", {
      loggerId: id,
      configured: logger.configuredLevel,
      effective: logger.level,
    });
    return logger;
  }

  getAll(): Logger[] {
    const loggers = Array.from(this._loggers.values());
    this._log.debug("Retrieved all loggers", { count: loggers.length });
    return loggers;
  }

  getMap(): Map<string, Logger> {
    return this._loggers;
  }

  destroy() {
    this._log.info("Destroying registry");
    const loggerCount = this._loggers.size;

    if (this._unsubscribe) {
      this._log.debug("Unsubscribing from store");
      this._unsubscribe();
      this._unsubscribe = undefined;
    }

    this._store = undefined;
    this._loggers.clear();
    this._configCache.clear();

    this._log.debug("Registry destroyed", { loggerCount });
  }
}
