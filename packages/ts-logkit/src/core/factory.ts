// ./packages/ts-logkit/src/core/factory.ts
import { Logger } from "./logger";
import { NoopLogger } from "./noop";
import { Registry } from "../registry/registry";
import { Config, ConfigOverride } from "./types/config";
import { LoggerNotFoundError } from "../registry";
import { LoggerLike } from "./types/loggerLike";

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
  createLogger(id: string, runtimeDefaults?: ConfigOverride): LoggerLike;
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
 * // Bootstrap registry with store (must be awaited before creating loggers)
 * await registry.bootstrap(myStore);
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

      // 1. Try to get existing logger from registry (same instance)
      let existingLogger: Logger | undefined;
      try {
        existingLogger = registry?.get(id);
        if (existingLogger) {
          return existingLogger;
        }
      } catch (error) {
        if (error instanceof LoggerNotFoundError) {
          log.warn("Logger not found in registry, creating new one", id);
        } else {
          log.error("Error getting logger from registry", { error, id });
          throw error;
        }
      }

      // 2. Logger wasn't found, create anew and register
      const logger = new Logger({ id, ...resolvedConfig });
      (logger as any).factory = factory; // Attach factory to logger for logger.child() calls to use same factory
      registry?.register(logger);

      return logger;
    },
  };

  return factory;
}

export const NoopLoggerFactory: LoggerFactory = {
  createLogger: (id: string, runtimeDefaults?: ConfigOverride): LoggerLike => {
    return NoopLogger;
  },
};
