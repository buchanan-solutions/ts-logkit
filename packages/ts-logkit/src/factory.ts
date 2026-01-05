// ./packages/ts-logkit/src/factory.ts
import { Logger } from "./logger";
import { Registry } from "./registry";
import { Config } from "./types/config";

/**
 * Configuration for creating a logger factory (all Config properties except id, plus optional Registry)
 */
export type FactoryConfig = Omit<Config, "id"> & {
  /** Registry for managing logger lifecycle and dynamic configuration */
  registry?: Registry;
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
 * @param config - Configuration for the factory (transports, formatter, hooks, level, type, registry)
 * @returns A factory function that creates loggers with the provided configuration
 * @example
 * Simple factory without registry:
 * ```typescript
 * const factory = createLoggerFactory({
 *   transports: [consoleTransport],
 *   formatter: devFormatter,
 *   level: "info"
 * });
 *
 * const logger = factory.createLogger("my-logger");
 * ```
 *
 * @example
 * Factory with registry for dynamic configuration:
 * ```typescript
 * const registry = new Registry();
 * const factory = createLoggerFactory({
 *   transports: [consoleTransport],
 *   formatter: devFormatter,
 *   hooks: [myHook],
 *   level: "info",
 *   registry
 * });
 *
 * // Attach store to registry (optional)
 * registry.attachStore(myStore);
 *
 * const logger = factory.createLogger("my-logger");
 * ```
 */
export function createLoggerFactory(config: FactoryConfig): LoggerFactory {
  const { registry, ...runtimeConfig } = config;

  return {
    createLogger: (
      id: string,
      overrides?: { level?: Config["level"]; type?: Config["type"] }
    ): Logger => {
      const logger = new Logger({
        id,
        ...runtimeConfig,
        ...overrides,
      });
      // Only register if registry is provided
      registry?.register(logger);
      return logger;
    },
  };
}
