import { Logger } from "./logger";
import { NoopLogger } from "./noop";
import { Registry } from "../registry/registry";
import { type Config, type ConfigOverride } from "./types/config";
import { type Level } from "./types/level";
import { LoggerNotFoundError } from "../registry";
import { type LoggerLike } from "./types/loggerLike";

/**
 * Configuration for creating a logger factory (all Config properties except id, plus optional Registry)
 */
export type FactoryConfig = Omit<Config, "id" | "parent" | "fallbackLevel"> & {
  /** Registry for managing logger lifecycle and dynamic configuration */
  registry?: Registry;
  logConfig?: Config;
};

/**
 * Factory that creates loggers with shared transports/formatter and optional registry.
 * `defaultLevel` is the process fallback when a logger's ancestor chain is all NOTSET —
 * it is not stamped onto children as a configured pin.
 */
export interface LoggerFactory {
  /** Factory default / process fallback (typically LOG_LEVEL). */
  readonly defaultLevel: Level;
  /** Attached registry when bootstrapped for live updates. */
  readonly registry?: Registry;
  createLogger(id: string, runtimeDefaults?: ConfigOverride): LoggerLike;
  /** Alias of `createLogger` — Python-shaped name. */
  getLogger(id: string, runtimeDefaults?: ConfigOverride): LoggerLike;
}

/**
 * Creates a logger factory with default configuration.
 * New loggers are configured NOTSET unless `runtimeDefaults.level` or the registry cache pins them.
 * @param config - Configuration for the factory (transports, formatter, hooks, level, type, registry)
 */
export function createLoggerFactory(config: FactoryConfig): LoggerFactory {
  const log = config.logConfig ? new Logger(config.logConfig) : NoopLogger;

  log.info("Creating logger factory");
  log.debug("Factory config", { config });
  const { registry, level: factoryLevel = "warn", logConfig: _logConfig, ...restDefaults } =
    config;

  if (registry) {
    registry.defaultLevel = factoryLevel;
  }

  const factory: LoggerFactory = {
    defaultLevel: factoryLevel,
    registry,

    createLogger: (id, runtimeDefaults) => {
      log.info(`Creating logger: ${id}`);
      log.debug("runtimeDefaults", { runtimeDefaults });

      try {
        const existingLogger = registry?.get(id);
        if (existingLogger) {
          return existingLogger;
        }
      } catch (error) {
        if (!(error instanceof LoggerNotFoundError)) {
          log.error("Error getting logger from registry", { error, id });
          throw error;
        }
      }

      const explicitLevel = runtimeDefaults?.level;
      const loggerConfig: Config = {
        id,
        transports: runtimeDefaults?.transports ?? restDefaults.transports,
        formatter: runtimeDefaults?.formatter ?? restDefaults.formatter,
        hooks: runtimeDefaults?.hooks ?? restDefaults.hooks,
        type: runtimeDefaults?.type ?? restDefaults.type,
        fallbackLevel: factoryLevel,
        factory,
        parent: runtimeDefaults?.parent,
      };
      if (explicitLevel !== undefined) {
        loggerConfig.level = explicitLevel;
      }

      const logger = new Logger(loggerConfig);
      logger.factory = factory;
      registry?.register(logger);

      return logger;
    },

    getLogger(id, runtimeDefaults) {
      return factory.createLogger(id, runtimeDefaults);
    },
  };

  return factory;
}

export const NoopLoggerFactory: LoggerFactory = {
  defaultLevel: "warn",
  createLogger: (_id: string, _runtimeDefaults?: ConfigOverride): LoggerLike => {
    return NoopLogger;
  },
  getLogger: (_id: string, _runtimeDefaults?: ConfigOverride): LoggerLike => {
    return NoopLogger;
  },
};
