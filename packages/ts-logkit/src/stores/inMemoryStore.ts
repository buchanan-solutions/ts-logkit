import { type LoggerStoreConfig, type Store, type SystemConfig } from "./store";

/**
 * In-memory logging storage implementation.
 * Rows are explicit severities only — absence means NOTSET / inherit.
 */
export class InMemoryStore implements Store {
  private _config: Map<string, LoggerStoreConfig> = new Map();

  /**
   * Get the current logging configuration
   */
  async list(): Promise<SystemConfig> {
    return Array.from(this._config.values());
  }

  /**
   * Replace the full system logging configuration (clear + write).
   */
  async setAll(config: SystemConfig): Promise<void> {
    this._config.clear();
    for (const c of config) {
      this._config.set(c.id, c);
    }
  }

  /**
   * Set a new logger configuration
   */
  async set(config: LoggerStoreConfig): Promise<void> {
    this._config.set(config.id, config);
  }

  /**
   * Remove a logger configuration row (inherit again).
   */
  async delete(id: string): Promise<void> {
    this._config.delete(id);
  }

  /**
   * Get a logger configuration
   */
  async get(id: string): Promise<LoggerStoreConfig> {
    const config = this._config.get(id);
    if (!config) {
      throw new Error(`Logger ${id} not found`);
    }
    return config;
  }
}
