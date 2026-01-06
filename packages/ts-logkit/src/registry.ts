// src/registry.ts
import { Logger } from "./logger";
import { Store, SystemConfig } from "./types/store";
import { Level } from "./types/level";
import { shouldLog } from "./utils/shouldLog";
import { validateLevelAndWarn } from "./utils/validateLevel";
import { LoggerNotFoundError } from "./errors/loggerNotFound";

export class Registry {
  // Class-level logging
  private static _log_level: Level = "warn";

  private _loggers = new Map<string, Logger>();
  private _store?: Store;
  private _unsubscribe?: () => void;

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
    const logger = this._loggers.get(id);
    if (!logger) {
      throw new LoggerNotFoundError(id);
    }
    return logger;
  }

  getAll(): Logger[] {
    return Array.from(this._loggers.values());
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
    if (exists && shouldLog(Registry._log_level, "warn")) {
      console.warn(
        `[ts-logkit:Registry] Logger "${logger.id}" already exists, replacing.`
      );
    }

    // Add logger to registry
    this._loggers.set(logger.id, logger);

    // Sync with store if available
    if (this._store) {
      this._store
        .get(logger.id)
        .then((config) => {
          // Apply stored configuration to logger
          if (config.level !== undefined) {
            logger.setLevel(config.level);
          }
        })
        .catch(() => {
          // Logger not in store → persist default config
          void this._store?.set({ id: logger.id, level: logger.level });
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
    if (!this._store) {
      throw new Error("Registry has no store attached");
    }
    return this._store.set({ id, level });
  }

  /**
   * Delete a logger (e.g. on React component unmount)
   * @param id - The ID of the logger to delete
   */
  delete(id: string) {
    this._loggers.delete(id);
  }

  attachStore(store: Store) {
    // Clean up existing subscription if any
    this._unsubscribe?.();
    this._store = store;

    // Initial sync - apply existing configs to set loggers
    void store.list().then((configs) => {
      for (const cfg of configs) {
        const logger = this._loggers.get(cfg.id);
        if (logger && cfg.level !== undefined && logger.level !== cfg.level) {
          logger.setLevel(cfg.level);
        }
      }
    });

    // Single subscription for all loggers
    if (store.subscribeAll) {
      this._unsubscribe = store.subscribeAll((cfg) => {
        const logger = this._loggers.get(cfg.id);
        if (logger && cfg.level !== undefined) {
          logger.setLevel(cfg.level);
        }
      });
    }
  }

  destroy() {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    this._store = undefined;
    this._loggers.clear();
  }
}
