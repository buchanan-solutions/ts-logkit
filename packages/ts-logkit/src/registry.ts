// src/registry.ts
import { Logger } from "./logger";
import { Store, SystemConfig } from "./types/store";
import { Level } from "./types/level";
import { shouldLog } from "./utils/shouldLog";
import { validateLevelAndWarn } from "./utils/validateLevel";
import { LoggerNotFoundError } from "./errors/loggerNotFound";
import type { LoggerLike } from "./types/loggerLike";
import type { Config } from "./types/config";
import { NoopLogger } from "./noop";

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
   * Registers a logger in the registry and syncs it with the attached store if available.
   * When a store is attached, the logger's configuration will be loaded from the store
   * or persisted to the store if not found.
   *
   * @param logger - The logger to register
   */
  set(logger: Logger) {
    // Check if logger already exists and warn if replacing
    const exists = this._loggers.has(logger.id);
    if (exists) {
      this._log.warn("Logger already exists, replacing", {
        loggerId: logger.id,
      });
    }

    // Add logger to registry
    this._loggers.set(logger.id, logger);
    this._log.info("Logger registered", {
      loggerId: logger.id,
      level: logger.level,
    });

    // Sync with store if available
    if (this._store) {
      this._log.debug("Syncing logger with store", { loggerId: logger.id });
      this._store
        .get(logger.id)
        .then((config) => {
          // Apply stored configuration to logger
          if (config.level !== undefined) {
            this._log.debug("Applying stored config to logger", {
              loggerId: logger.id,
              storedLevel: config.level,
              currentLevel: logger.level,
            });
            logger.setLevel(config.level);
          } else {
            this._log.debug("No stored level config found", {
              loggerId: logger.id,
            });
          }
        })
        .catch(() => {
          // Logger not in store → persist default config
          this._log.debug("Logger not in store, persisting default config", {
            loggerId: logger.id,
            defaultLevel: logger.level,
          });
          void this._store?.set({ id: logger.id, level: logger.level });
        });
    } else {
      this._log.debug("No store attached, skipping sync", {
        loggerId: logger.id,
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
   * Delete a logger (e.g. on React component unmount)
   * @param id - The ID of the logger to delete
   */
  delete(id: string) {
    const existed = this._loggers.has(id);
    this._loggers.delete(id);
    if (existed) {
      this._log.debug("Logger deleted from registry", { loggerId: id });
    } else {
      this._log.debug("Attempted to delete non-existent logger", {
        loggerId: id,
      });
    }
  }

  attachStore(store: Store) {
    this._log.info("Attaching store to registry");

    // Clean up existing subscription if any
    if (this._unsubscribe) {
      this._log.debug("Cleaning up existing store subscription");
      this._unsubscribe();
    }
    this._store = store;

    // Initial sync - apply existing configs to set loggers
    this._log.debug("Performing initial sync with store");
    void store.list().then((configs) => {
      this._log.debug("Retrieved configs from store", {
        configCount: configs.length,
      });
      let appliedCount = 0;
      for (const cfg of configs) {
        const logger = this._loggers.get(cfg.id);
        if (logger && cfg.level !== undefined && logger.level !== cfg.level) {
          this._log.debug("Applying stored config to existing logger", {
            loggerId: cfg.id,
            storedLevel: cfg.level,
            currentLevel: logger.level,
          });
          logger.setLevel(cfg.level);
          appliedCount++;
        }
      }
      this._log.debug("Initial sync complete", {
        configCount: configs.length,
        appliedCount,
        loggerCount: this._loggers.size,
      });
    });

    // Single subscription for all loggers
    if (store.subscribeAll) {
      this._log.debug("Setting up store subscription for all loggers");
      this._unsubscribe = store.subscribeAll((cfg) => {
        const logger = this._loggers.get(cfg.id);
        if (logger && cfg.level !== undefined) {
          this._log.debug("Store config change received, updating logger", {
            loggerId: cfg.id,
            newLevel: cfg.level,
            currentLevel: logger.level,
          });
          logger.setLevel(cfg.level);
        } else if (!logger) {
          this._log.debug("Store config change received for unknown logger", {
            loggerId: cfg.id,
          });
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
