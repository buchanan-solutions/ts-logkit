# ts-logkit

## 0.0.0

### Added

- Initial release
- Core logger (`createLogger`) with configurable log level filtering
- Six log levels: trace, debug, info, warn, error, fatal
- Pluggable transport interface (`LogTransport`)
- Hook-based log fanout (`LogHook`) with async support
- Console transport (`createConsoleTransport`) with development formatter
- Colored development console output with ANSI color codes
- Context support: all log methods accept optional context objects
- Error handling: `error` and `fatal` methods accept optional `Error` objects
- Automatic timestamp generation for all log events
- TypeScript type definitions exported (`LogLevel`, `LogEvent`, `LogTransport`, `LogHook`)

---

## 0.0.1

### Added

- `src/transports:combineTransports` function for consumers to conveniently combine multiple transports
- Loggers now support multiple transports

### Changed

- Simplified error handling: removed any verbose error or error verbosity features to keep the API simple and put the responsibility of what to log on the user
- refactored `src/types`
- seperated concerns for `formatters` and `trasnports`
-

### Breaking

- removed `... createLogger(...)` replaced with `... new Logger(Config)`
- Logger emit calls (info, debug, etc.) now expect

## 0.0.2

### Added

- global disable (via env var or `src/global.ts` functions)
- noop logger
- Logger factory system (`createLoggerFactory`) for creating multiple loggers with shared configuration
- Store system for dynamic logger configuration management
  - `Store` interface for persisting and retrieving logger configurations
  - `InMemoryStore` implementation for in-memory storage
  - Logger instances can subscribe to store updates for runtime level changes
  - Stores only contain serializable data (level), not runtime objects (transports, formatters, hooks)
- `destroy()` method on Logger for cleanup of store subscriptions
- add utils (validateLevels, sholdLog)
- Registry.logLevel (static class-level log verbosity for direct console.warns)
- Global:setInternalLogLevel(level)
  - sets all packages / classes that have static logging flags to whatever level to enable package-level logging for behavior testing

### Changed

- Development formatter no longer includes timestamp in output (time display removed)
- Logger constructor now accepts optional `store` parameter for dynamic configuration

### Breaking

- pulled out dynamic reconfig logic from Logger (moved to registry & store)
  - deleted async Logger.applyStoreConfig() and conditional store config behavior on Logger.constructor
- pulled store out of factory so factory only takes in registry (where registry is what needs a store)
  - registry > provides central registry for reconfigs (actual feature)
  - store > provides some storage layer for registry to "pull" the configs if they exist and reapply at runtime / register time
