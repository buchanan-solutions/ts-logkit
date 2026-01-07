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

  constructor(logConfig?: Config) {
    this._log = logConfig ? new Logger(logConfig) : NoopLogger;
  }

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
      this._log.error("Logger not found in registry", { loggerId: id });
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

  register(logger: Logger): void {
    const existing = this._loggers.get(logger.id);
    this._loggers.set(logger.id, logger);

    // 🔑 HYDRATE FROM STORE ON REGISTER
    if (this._store?.get) {
      this._store
        .get(logger.id)
        .then((cfg) => {
          if (cfg?.level !== undefined) {
            this._log.debug("Hydrating logger from store on register", {
              loggerId: logger.id,
              level: cfg.level,
            });
            logger.setLevel(cfg.level);
          }
        })
        .catch(() => {
          // no stored config yet — ignore
        });
    }

    if (existing) {
      this._log.debug("Logger replaced", { loggerId: logger.id });
    } else {
      this._log.info("Logger registered", {
        loggerId: logger.id,
        level: logger.level,
      });
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
   * Attach a store to enable reactive updates via subscribeAll.
   * Only updates loggers that are currently registered in the Map.
   *
   * @param store - The store instance to attach
   */
  attachStore(store: Store): void {
    this._log.info("Attaching store to registry");

    // Clean up existing subscription if any
    if (this._unsubscribe) {
      this._log.debug("Cleaning up existing store subscription");
      this._unsubscribe();
    }
    this._store = store;

    // Single subscription for all loggers
    if (store.subscribeAll) {
      this._log.debug("Setting up store subscription for all loggers");
      this._unsubscribe = store.subscribeAll((cfg) => {
        // CRITICAL SAFETY CHECK: Only update if logger exists
        const logger = this._loggers.get(cfg.id);
        if (!logger) {
          // Logger not registered yet - ignore store update
          // Prevents updating loggers that haven't been created
          // Consumer will handle initial sync when registering
          this._log.debug(
            "Store config change for unregistered logger, ignoring",
            {
              loggerId: cfg.id,
            }
          );
          return;
        }

        // Logger exists - safe to update
        if (cfg.level !== undefined) {
          this._log.debug("Store config change received, updating logger", {
            loggerId: cfg.id,
            newLevel: cfg.level,
            currentLevel: logger.level,
          });
          logger.setLevel(cfg.level);
        }
      });
    } else {
      this._log.debug("Store does not support subscribeAll");
    }
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

    this._log.debug("Registry destroyed", { loggerCount });
  }
}
