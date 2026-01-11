import { LoggerStoreConfig, Store, SystemConfig } from "./store";
/**
 * In-memory logging storage implementation
 */
export class InMemoryStore implements Store {
  private _config: Map<string, LoggerStoreConfig> = new Map();

  /**
   * Get the current logging configuration
   * @returns The current logging configuration
   */
  async list(): Promise<SystemConfig> {
    return Array.from(this._config.values());
  }

  /**
   * Set the current logging configuration
   * @param config The new logging configuration
   */
  async setAll(config: SystemConfig): Promise<void> {
    for (const c of config) {
      this._config.set(c.id, c);
    }
  }

  /**
   * Set a new logger configuration
   * @param config The new logger configuration (only serializable data)
   */
  async set(config: LoggerStoreConfig): Promise<void> {
    this._config.set(config.id, config);
  }

  /**
   * Get a logger configuration
   * @param id The id of the logger to get
   * @returns The logger configuration (only serializable data)
   */
  async get(id: string): Promise<LoggerStoreConfig> {
    const config = this._config.get(id);
    if (!config) {
      throw new Error(`Logger ${id} not found`);
    }
    return config;
  }
}
