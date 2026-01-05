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

### Changed

-

### Breaking

-
