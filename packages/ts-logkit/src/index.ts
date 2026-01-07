// Core exports (top-level imports)
export { Logger, createLoggerFactory } from "./core";
export type { LoggerFactory, FactoryConfig } from "./core";

// Registry exports
export { Registry } from "./registry/registry";

// Storage exports
export { InMemoryStore } from "./storage";
export type { Store, LoggerStoreConfig, SystemConfig } from "./storage";

// Additional core utilities
export { Global, setInternalLogLevel } from "./core";
export { NoopLogger } from "./core";
export * from "./core/formatters";
export * from "./core/transports";
export * from "./core/types";

// CRITICAL: Do NOT export internal utils via wildcard
// Only export specific public utilities if needed
export { validateLevel } from "./core/utils/validateLevel";

export { LoggerNotFoundError } from "./core/errors/loggerNotFound";

// Init (side-effect import)
export * from "./core/init";
