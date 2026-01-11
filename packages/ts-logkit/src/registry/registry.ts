// packages/ts-logkit/src/registry/registry.ts
import { Logger } from "../core/logger";
import { Store } from "../stores/store";
import { Level } from "../core/types/level";
import { validateLevelAndWarn } from "../core/utils/validateLevel";
import { LoggerNotFoundError } from "../core/errors/loggerNotFound";
import type { LoggerLike } from "../core/types/loggerLike";
import type { Config } from "../core/types/config";
import { NoopLogger } from "../core/noop";

export class Registry {
  // Class-level logging
  private static _log_level: Level = "warn";

  private _loggers = new Map<string, Logger>();
  private _configCache = new Map<string, Level>();
  private _store?: Store;
  private _unsubscribe?: () => void;

  private _log: LoggerLike;

  static get logLevel(): Level {
    return Registry._log_level;
  }
  static set logLevel(level: Level) {
    // Leave warn = true here so it always warns on failure (as this governs other class-level warnings)
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
  constructor(logConfig?: Config) {
    this._log = logConfig ? new Logger(logConfig) : NoopLogger;
  }

  /**
   * Bootstrap the registry by loading all configurations from the store into a local cache.
   * This must be called before creating loggers to ensure synchronous configuration access.
   *
   * This method:
   * 1. Loads all configs from the store via `store.list()`
   * 2. Populates the internal `_configCache` for synchronous access
   * 3. Applies cached levels to any existing loggers
   * 4. Sets up reactive subscription for runtime store changes
   *
   * @param store - The store to bootstrap from
   * @example
   * ```ts
   * const registry = new Registry();
   * await registry.bootstrap(myStore);
   * // Now all logger creation is synchronous
   * ```
   */
  async bootstrap(store: Store): Promise<void> {
    this._log.info("Bootstrapping registry from store");

    if (this._unsubscribe) {
      this._log.debug("Cleaning up existing store subscription");
      this._unsubscribe();
    }

    this._store = store;

    // 1. Load all configs from store and populate cache
    const configs = await store.list();
    configs.forEach((cfg) => {
      if (cfg.level) {
        this._configCache.set(cfg.id, cfg.level as Level);
      }
    });
    this._log.info(`Loaded ${configs.length} configurations into cache`);

    // 2. Apply cached levels to any existing loggers synchronously
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

    // 3. Setup Reactive Subscription for future store changes
    if (store.subscribeAll) {
      this._unsubscribe = store.subscribeAll((cfg) => {
        // Update cache when store changes
        if (cfg.level !== undefined) {
          this._configCache.set(cfg.id, cfg.level as Level);
        }
        // Update logger instance if it exists
        const logger = this._loggers.get(cfg.id);
        if (logger && cfg.level !== undefined && cfg.level !== logger.level) {
          this._log.debug("Store reactive update", {
            id: cfg.id,
            level: cfg.level,
          });
          logger.setLevel(cfg.level as Level);
        }
      });
    }
  }

  /**
   * Register a logger in the registry.
   *
   * This method is fully synchronous and reads from the local config cache.
   * If the logger's configuration exists in the cache (from bootstrap), it is applied immediately.
   * If not, and a store is attached, the logger's current level is persisted to the store.
   *
   * @param logger - The logger to register
   */
  register(logger: Logger): void {
    this._loggers.set(logger.id, logger);
    this._log.info("Logger registered", { id: logger.id });

    // Synchronous hydration from cache
    const cachedLevel = this._configCache.get(logger.id);
    if (cachedLevel) {
      logger.setLevel(cachedLevel);
      this._log.debug("Applied cached level to logger", {
        id: logger.id,
        level: cachedLevel,
      });
    } else if (this._store) {
      // New logger - persist to store (fire-and-forget)
      this._log.debug("Persisting new logger to store", {
        id: logger.id,
        level: logger.level,
      });
      void this._store.set({ id: logger.id, level: logger.level });
    }
  }

  /**
   * Updates configuration for a logger.
   *
   * This method updates the cache and logger instance immediately (synchronous),
   * then pushes the update to the store asynchronously (fire-and-forget).
   *
   * Responsibility flow:
   * - Registry.update → updates cache (sync) → updates logger (sync) → pushes to store (async)
   *
   * @throws {Error} If no store is attached to the registry
   *
   * @param id - The ID of the logger to update
   * @param level - The new log level
   */
  update(id: string, level: Level) {
    // TODO: Change function signature to `update(id: string, patch: Partial<Config || LoggerStoreConfig>)` for future flexibility
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

    // 1. Update cache (synchronous)
    this._configCache.set(id, level);

    // 2. Update logger instance (synchronous)
    const logger = this._loggers.get(id);
    if (logger) {
      const previousLevel = logger.level;
      logger.setLevel(level);
      this._log.debug("Updated logger level", {
        loggerId: id,
        level,
        previousLevel,
      });
    }

    // 3. Push to store (async fire-and-forget)
    this._log.debug("Pushing config to store", {
      loggerId: id,
      level,
    });
    void this._store.set({ id, level });
  }

  /**
   * Unregister a logger from the registry.
   *
   * **CRITICAL**: Must be called on component unmount to prevent memory leaks.
   * Safe to call even if logger doesn't exist (idempotent).
   *
   * @param id - The logger ID to unregister
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
   * @param id - The logger ID to check
   * @returns true if logger exists, false otherwise
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
      level: logger.level,
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
