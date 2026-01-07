// ./packages/ts-logkit/src/core/factory.ts
import { Logger } from "./logger";
import { NoopLogger } from "./noop";
import { Registry } from "../registry/registry";
import { Config, ConfigOverride } from "./types/config";

/**
 * Configuration for creating a logger factory (all Config properties except id, plus optional Registry)
 */
export type FactoryConfig = Omit<Config, "id"> & {
  /** Registry for managing logger lifecycle and dynamic configuration */
  registry?: Registry;
  logConfig?: Config;
};

/**
 * Factory function that creates loggers with a given id
 */
export interface LoggerFactory {
  createLogger(id: string, runtimeDefaults?: ConfigOverride): Logger;
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
  const log = config.logConfig ? new Logger(config.logConfig) : NoopLogger;

  log.info("Creating logger factory");
  log.debug("Factory config", { config });
  const { registry, ...factoryDefaultConfig } = config;

  const factory: LoggerFactory = {
    createLogger: (id, runtimeDefaults) => {
      log.info(`Creating logger: ${id}`);
      log.debug("factoryDefaultConfig", { factoryDefaultConfig });
      log.debug("runtimeDefaults", { runtimeDefaults });
      const resolvedConfig = {
        ...factoryDefaultConfig,
        ...runtimeDefaults,
      };

      log.debug("resolvedConfig", { resolvedConfig });

      const logger = new Logger({ id, ...resolvedConfig });

      // Attach factory reference
      (logger as any).factory = factory;

      // Register in registry if provided
      registry?.register(logger);
      return logger;
    },
  };

  return factory;
}
