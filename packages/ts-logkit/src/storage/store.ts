import { Level } from "../core/types/level";

/**
 * Serializable configuration stored in the store
 * Only contains data that can be serialized (no functions/objects)
 */
export interface LoggerStoreConfig {
  id: string;
  level?: Level;
}

/** System-wide logging configuration is just an array of LoggerStoreConfig */
export type SystemConfig = LoggerStoreConfig[];

/**
 * Interface for storage of logger configs
 */
export interface Store {
  /** Get the full system logging configuration (all loggers) */
  list(): Promise<SystemConfig>;

  /** Replace the full system logging configuration */
  setAll(configs: SystemConfig): Promise<void>;

  /** Get a single logger's config by name */
  get(name: string): Promise<LoggerStoreConfig>;

  /** Save or update a single logger config */
  set(config: LoggerStoreConfig): Promise<void>;

  /**
   * Subscribe to changes for a specific logger's config
   * @param name - The logger name/id to subscribe to
   * @param callback - Function called when the config changes
   * @returns Unsubscribe function to stop listening to changes
   */
  subscribe?(
    name: string,
    callback: (config: LoggerStoreConfig) => void
  ): () => void;

  /**
   * Subscribe to changes for all loggers' configs
   * @param callback - Function called when the config changes
   * @returns Unsubscribe function to stop listening to changes
   */
  subscribeAll?(callback: (config: LoggerStoreConfig) => void): () => void;
}
