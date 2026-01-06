// src/registry.ts
import { Logger } from "./logger";
import { Store } from "./types/store";
import { Level } from "./types/level";
import { shouldLog } from "./utils/shouldLog";
import { validateLevelAndWarn } from "./utils/validateLevel";
import { LoggerNotFoundError } from "./errors/loggerNotFound";

export class Registry {
  // Class-level logging
  private static _log_level: Level = "warn";

  private loggers = new Map<string, Logger>();
  private store?: Store;
  private unsubscribe?: () => void;

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

  attachStore(store: Store) {
    // Clean up existing subscription if any
    this.unsubscribe?.();
    this.store = store;

    // Initial sync - apply existing configs to registered loggers
    void store.list().then((configs) => {
      for (const cfg of configs) {
        const logger = this.loggers.get(cfg.id);
        if (logger && cfg.level !== undefined) {
          logger.setLevel(cfg.level);
        }
      }
    });

    // Single subscription for all loggers
    if (store.subscribeAll) {
      this.unsubscribe = store.subscribeAll((cfg) => {
        const logger = this.loggers.get(cfg.id);
        if (logger && cfg.level !== undefined) {
          logger.setLevel(cfg.level);
        }
      });
    }
  }

  /**
   * Register a logger with the registry.
   * If no registry is provided, loggers are static and cannot be reconfigured.
   *
   * @param logger - The logger to register
   */
  register(logger: Logger) {
    if (this.loggers.has(logger.id) && shouldLog(Registry._log_level, "warn")) {
      console.warn(
        `[ts-logkit] Logger "${logger.id}" already registered, replacing.`
      );
    }

    this.loggers.set(logger.id, logger);

    // If store is already attached, apply initial config for this logger
    if (this.store) {
      void this.store.get(logger.id).then(
        (config) => {
          if (config.level !== undefined) {
            logger.setLevel(config.level);
          }
        },
        () => {
          // Logger not found in store, use defaults - this is fine
          // Silently ignore to prevent breaking logging
        }
      );
    }
  }

  /**
   * Unregister a logger (e.g. on React component unmount)
   * @param id - The ID of the logger to unregister
   */
  unregister(id: string) {
    this.loggers.delete(id);
  }

  destroy() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.store = undefined;
    this.loggers.clear();
  }
}
