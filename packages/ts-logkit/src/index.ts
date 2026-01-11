// Core exports (top-level imports)
export * from "./core";

// Registry exports
export { Registry } from "./registry/registry";

// Storage exports
export { InMemoryStore } from "./stores";
export type { Store, LoggerStoreConfig, SystemConfig } from "./stores";

// CRITICAL: Do NOT export internal utils via wildcard
// Only export specific public utilities if needed
export { validateLevel } from "./core/utils/validateLevel";

export { LoggerNotFoundError } from "./core/errors/loggerNotFound";

// Init (side-effect import)
export * from "./core/init";
