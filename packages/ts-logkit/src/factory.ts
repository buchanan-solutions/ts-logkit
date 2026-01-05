// ./packages/ts-logkit/src/factory.ts
import { Logger } from "./logger";
import { Config } from "./types/config";

/**
 * Configuration for creating a logger factory (all Config properties except id)
 */
export type FactoryConfig = Omit<Config, "id">;

/**
 * Factory function that creates loggers with a given id
 */
export interface LoggerFactory {
  createLogger(id: string, overrides?: Partial<Config>): Logger;
}

/**
 * Creates a logger factory with default configuration
 * @param config - Configuration for the factory (transports, formatter, hooks, level, type)
 * @returns A factory function that creates loggers with the provided configuration
 * @example
 * ```typescript
 * const factory = createLoggerFactory({
 *   transports: [consoleTransport],
 *   formatter: devFormatter,
 *   hooks: [myHook],
 *   level: "info"
 * });
 *
 * const logger = factory.createLogger("my-logger");
 * ```
 */
export function createLoggerFactory(config: FactoryConfig): LoggerFactory {
  return {
    createLogger: (id: string, overrides?: Partial<Config>): Logger => {
      return new Logger({
        id,
        ...config,
        ...overrides,
      });
    },
  };
}
