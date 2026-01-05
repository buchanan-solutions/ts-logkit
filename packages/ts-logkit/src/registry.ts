// src/registry.ts
import { Logger } from "./logger";
import { Store } from "./types/store";

export class Registry {
  private loggers = new Map<string, Logger>();
  private store?: Store;
  private unsubscribe?: () => void;

  attachStore(store: Store) {
    this.store = store;

    // Initial sync
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

  register(logger: Logger) {
    this.loggers.set(logger.id, logger);
  }

  unregister(id: string) {
    this.loggers.delete(id);
  }

  destroy() {
    this.unsubscribe?.();
    this.loggers.clear();
  }
}
