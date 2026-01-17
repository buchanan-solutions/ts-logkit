# ts-logkit

## 0.3.1

### Patch Changes

- add mock loggers with vitest optional peer dep (for documentation that this dep exists at some layer - see README.md)

#### Developer Changes

- added tsup.config.ts for easier build config management

## 0.3.0

This release introduces a major architectural shift in how configurations are managed. By moving from an "Attach" model to a "Bootstrap" model, `ts-logkit` now supports fully synchronous logger creation with immediate access to persisted configurations, eliminating hydration race conditions.

---

### 🚀 Major Changes & Features

- **Registry Bootstrap Pattern**: Replaced `attachStore()` with an asynchronous `bootstrap()` method.
- **Synchronous Configuration**: `bootstrap()` loads all store configurations into a local memory cache.
- **Zero-Latency Creation**: Loggers created via the factory now resolve their log levels synchronously from the cache, ensuring they start at the correct level from the first byte of code.

- **Performance Optimization**: Refactored the internal `emit` cycle to flatten the dispatch logic and improve "fire-and-forget" hook execution.
- **Client-Side Awareness**: The Dev Formatter now detects browser environments (`window`) and adds a visual marker (`~`) to logger IDs to distinguish client-side logs in unified streams.

### 🛠 Refactors & Improvements

- **Store Naming Convention**: Renamed the `/storage` directory and exports to `/stores` for better alignment with modern state-management terminology.
- **Improved Registry Error Handling**:
- `get()` now throws a `LoggerNotFoundError` with clearer diagnostic warnings.
- `register()` is now idempotent and handles hydration asynchronously if a new logger is introduced post-bootstrap.

- **Type Safety**:
- Updated `LoggerFactory` to return `LoggerLike` interfaces.
- Added `NoopLoggerFactory` to support safe "logging disabled" states in consumer applications.

- **Idempotency Strategy**: When a logger is registered that doesn't exist in the store, the registry now automatically persists the runtime default to the store to ensure "discovery" of all loggers.

### 🐛 Bug Fixes

- **Async/Sync Friction**: Fixed a race condition where logs emitted immediately after logger creation would use default levels instead of stored levels.
- **Internal Logging**: Cleaned up registry-level debug/info logs to be less intrusive during high-frequency registration events.

---

### ⚠️ Breaking Changes

1. **Registry Initialization**: You must now `await registry.bootstrap(store)` before calling `factory.createLogger()` if you rely on persisted log levels.
2. **Import Paths**: Any imports from `@buchanan-solutions/ts-logkit/storage` must be updated to `@buchanan-solutions/ts-logkit/stores`.
3. **Factory Output**: `createLogger` now returns a `LoggerLike` type; if you are using TypeScript and accessing internal class properties, an explicit cast to `Logger` may be required.

## 0.2.0

#### Added

- Internal logger added to registry
- `ConfigOverride` support
- Registry methods: `get()`, `getAll()`, `store`, `set()`, `update()`, `delete()` (replacing `Register`/`unregister`)
- Logger.child now works and can spawn new factory instances

#### Changed

- Refactored ts-logkit: server and stores separated for import clarity
- Fixed global `envLevel` read in `shouldLog` logic

#### Breaking

- Major refactor of registry and logger structure
- Registry now fully reactive; async/persistence logic removed from Registry

## 0.1.0

### Patch Changes

- Impmlemented logger registry system with configureable store for config persistence

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
