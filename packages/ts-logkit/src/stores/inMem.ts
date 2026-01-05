import { Config, Store, SystemConfig } from "../types";
/**
 * In-memory logging storage implementation
 */
export class InMemoryStore implements Store {
  private config: SystemConfig = [];

  /**
   * Get the current logging configuration
   * @returns The current logging configuration
   */
  async list(): Promise<SystemConfig> {
    return this.config;
  }

  /**
   * Set the current logging configuration
   * @param config The new logging configuration
   */
  async setAll(config: SystemConfig): Promise<void> {
    this.config = config;
  }

  /**
   * Set a new logger configuration
   * @param logger The new logger configuration
   */
  async set(config: Config): Promise<void> {
    this.config.push(config);
  }

  /**
   * Get a logger configuration
   * @param id The id of the logger to get
   * @returns The logger configuration
   */
  async get(id: string): Promise<Config> {
    const config = this.config.find((config) => config.id === id);
    if (!config) {
      throw new Error(`Logger ${id} not found`);
    }
    return config;
  }
}
