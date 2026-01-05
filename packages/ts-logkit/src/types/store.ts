import { Config } from "./config";

/** System-wide logging configuration is just an array of Config */
export type SystemConfig = Config[];

/**
 * Interface for storage of logger configs
 */
export interface Store {
  /** Get the full system logging configuration (all loggers) */
  list(): Promise<SystemConfig>;

  /** Replace the full system logging configuration */
  setAll(configs: SystemConfig): Promise<void>;

  /** Get a single logger's config by name */
  get(name: string): Promise<Config>;

  /** Save or update a single logger config */
  set(config: Config): Promise<void>;
}
