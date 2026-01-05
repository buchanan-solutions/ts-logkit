// ./packages/ts-logkit/src/factory.ts
import { Logger } from "./logger";
import { Config } from "./types/config";
import { Store } from "./types/store";

/**
 * Configuration for creating a logger factory (all Config properties except id, plus optional Store)
 */
export type FactoryConfig = Omit<Config, "id"> & {
  /** Optional store for dynamic level configuration updates */
  store?: Store;
};

/**
 * Factory function that creates loggers with a given id
 */
export interface LoggerFactory {
  createLogger(
    id: string,
    overrides?: { level?: Config["level"]; type?: Config["type"] }
  ): Logger;
}

/**
 * Creates a logger factory with default configuration
 * @param config - Configuration for the factory (transports, formatter, hooks, level, type, store)
 * @returns A factory function that creates loggers with the provided configuration
 * @example
 * ```typescript
 * const factory = createLoggerFactory({
 *   transports: [consoleTransport],
 *   formatter: devFormatter,
 *   hooks: [myHook],
 *   level: "info",
 *   store: myStore
 * });
 *
 * const logger = factory.createLogger("my-logger");
 * ```
 */
export function createLoggerFactory(config: FactoryConfig): LoggerFactory {
  const { store, ...runtimeConfig } = config;
  return {
    createLogger: (
      id: string,
      overrides?: { level?: Config["level"]; type?: Config["type"] }
    ): Logger => {
      return new Logger(
        {
          id,
          ...runtimeConfig,
          ...overrides,
        },
        store
      );
    },
  };
}
