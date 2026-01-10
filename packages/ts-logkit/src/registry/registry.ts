// packages/ts-logkit/src/registry/registry.ts
import { Logger } from "../core/logger";
import { Store } from "../storage/store";
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
   * Attach a store and synchronize existing loggers.
   * This handles the transition from "buffering" to "live" logging.
   */
  async attachStore(store: Store): Promise<void> {
    this._log.info("Attaching store to registry");

    if (this._unsubscribe) {
      this._log.debug("Cleaning up existing store subscription");
      this._unsubscribe();
    }

    this._store = store;

    // 1. Initial Sync: Hydrate every logger that was created before the store was ready.
    // We use Promise.all to do this in parallel.
    const activeLoggers = Array.from(this._loggers.values());
    if (activeLoggers.length > 0) {
      this._log.info(`Hydrating ${activeLoggers.length} existing loggers...`);
      await Promise.all(
        activeLoggers.map((logger) => this.hydrateLogger(logger))
      );
    }

    // 2. RELEASE THE BUFFER: Now that loggers have their store-configs,
    // we flush all logs that were waiting in the chronological queue.
    this._log.debug("Hydration complete. Flushing diagnostic buffer.");

    // 3. Setup Reactive Subscription for future store changes
    if (store.subscribeAll) {
      this._unsubscribe = store.subscribeAll((cfg) => {
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

  private async hydrateLogger(logger: Logger) {
    try {
      const storedCfg = await this._store?.get(logger.id);
      if (storedCfg?.level) {
        logger.setLevel(storedCfg.level as Level);
        this._log.debug("Hydrated from store", {
          id: logger.id,
          level: storedCfg.level,
        });
      } else {
        // IDEMPOTENCY: If store doesn't have it, write the runtime default to the store
        // so the store becomes populated with all file-level loggers automatically.
        await this._store?.set({ id: logger.id, level: logger.level });
      }
    } catch (err) {
      // Logger not in store yet or store unreachable - keep defaults
    }
  }

  /**
   * Register a logger in the registry.
   *
   * This method is synchronous and will block the main thread until the logger is registered.
   *
   * The logger is registered in the registry and the store is hydrated asynchronously.
   *
   * @param logger - The logger to register
   */
  register(logger: Logger): void {
    this._loggers.set(logger.id, logger);
    this._log.info("Logger registered (sync)", { id: logger.id });

    // Asynchronous hydration (fire and forget)
    if (this._store) {
      this._log.info("Hydrating logger from store (async)", { id: logger.id });
      this.hydrateLogger(logger);
    }
  }

  /**
   * Updates configuration for a logger via the attached store.
   *
   * This method expresses intent only. The actual Logger instance is updated
   * indirectly via the registry's subscription to store changes.
   *
   * Responsibility flow:
   * - Registry.update → writes config to the store
   * - Store notifies subscribers
   * - Registry applies the change to the live Logger instance
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
    const currentLogger = this._loggers.get(id);
    this._log.debug("Writing config to store", {
      loggerId: id,
      level,
      currentLevel: currentLogger?.level,
    });
    return this._store.set({ id, level });
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

  /**
   * Register a logger instance in the registry.
   *
   * **Important for SPA applications:**
   * - Always pair register() with unregister() in component cleanup
   * - Registry is a singleton - loggers persist across route changes
   * - Unregistered loggers will never be garbage collected
   *
   * This method is idempotent - safe to call multiple times with the same logger ID.
   * Handles race conditions gracefully when multiple components register the same logger simultaneously.
   *
   * @param logger - The logger instance to register
   * @example
   * ```ts
   * useEffect(() => {
   *   const logger = factory.createLogger("MyComponent");
   *   registry.register(logger);
   *   return () => registry.unregister("MyComponent");
   * }, []);
   * ```
   */
  // register(logger: Logger): void {
  //   const existing = this._loggers.get(logger.id);
  //   const isReplacement = existing !== undefined;

  //   // Idempotent operation - safe to overwrite
  //   this._loggers.set(logger.id, logger);

  //   if (isReplacement) {
  //     this._log.debug("Logger replaced", { loggerId: logger.id });
  //   } else {
  //     this._log.info("Logger registered", {
  //       loggerId: logger.id,
  //       level: logger.level,
  //     });
  //   }
  // }

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

    this._log.debug("Registry destroyed", { loggerCount });
  }
}
