# BuchananSolutions TypeScript Logging Kit

This repo is a **pnpm monorepo** containing the core SDK and framework-specific extensions.

---

## Packages

### `@buchanan-solutions/ts-logkit`

The **core, framework-agnostic TypeScript logging SDK**.

`ts-logkit` is designed to be **small, fast, and highly composable**, providing a modern, extensible logging framework for TypeScript applications while remaining fully decoupled from any UI or backend framework.

Its goal is to **empower developers to add structured, consistent, and extensible logging** to their projects with minimal boilerplate, while keeping production and development concerns cleanly separated.

---

## Key Features

### 1. **Structured Logger Instances**

- Named loggers (`name`) with optional type categorization (`type`).
- Per-logger log levels with numeric precedence for flexible filtering.
- Context-aware logging: all log methods accept optional context objects.
- Fully typed TypeScript interface for safety (`LogLevel`, `LogEvent`, `LogTransport`, `LogHook`).

### 2. **Rich Log Levels**

- Core levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.
- Extended levels for clarity and semantic tracking: `success`, `start`.
- Automatic filtering based on current logger or module-level log levels.

### 3. **Pluggable Transport Interface**

- Define multiple output destinations via `LogTransport`:

  - Console
  - Files (via adapters)
  - Remote APIs or telemetry systems
  - Third-party logging libraries (like Pino, Bunyan)

- Each transport decides how to render or persist log events.
- Supports synchronous or asynchronous transports for safe fanout.

### 4. **Hook-Based Extensions**

- `LogHook` interface for side effects such as:

  - Sending logs to external services
  - Analytics or monitoring events
  - Custom formatting or enrichment pipelines

- Hooks are async-capable, fail-safe, and non-blocking.
- Multiple hooks can be attached per logger or per transport.

### 5. **Central Logger Registry**

- Tracks logger instances at runtime for:

  - Global log-level overrides
  - Dynamic log-level updates across multiple modules
  - Discovery and management of all loggers in an application

- Framework-agnostic: registry logic lives entirely in core.
- Compatible with **adapters** that persist configuration (e.g., localStorage for Next.js clients).

### 6. **Development-Mode Features**

- ANSI-colored console output for clear, readable logs in terminals.
- Optional trace logs that include caller context.
- Extensible formatter layer for customizing message layouts and colors.
- Supports browser-safe formatting for client-side logs.

### 7. **Future-Proof Architecture**

- Clear separation of **core logging** vs **framework-specific adapters**.
- Extensible configuration provider interface for storage backends:

  - LocalStorage
  - Redis
  - File-system
  - REST / API endpoints

- Designed for incremental adoption:

  - Start with console logging
  - Add persistence or remote logging later

- Safe for server, client, and universal applications.

---

## Responsibilities of `ts-logkit` Core

1. Provide a **stable, fully typed logging API** for developers.
2. Manage a **central, framework-agnostic registry** of logger instances.
3. Enable **pluggable transports** and **hook-based log fanout**.
4. Offer **colored, context-rich development logging**.
5. Expose hooks and interfaces to support **future persistence and integrations**, without forcing any implementation.

---

## Intended Usage

`ts-logkit` is intended to be used in:

- **Node.js applications**: backend logging, CLI tools, server-side APIs.
- **Browser / client apps**: debug console logging, feature flag-driven log levels, and telemetry.
- **Framework-specific extensions**: e.g., `ts-logkit-next` for Next.js App Router integration.
- **Microservices / SDKs**: any TypeScript package needing consistent logging.

Typical usage:

```ts
import {
  createLogger,
  createConsoleTransport,
} from "@buchanan-solutions/ts-logkit";

const logger = createLogger({
  name: "collector",
  level: "debug",
  transport: createConsoleTransport(),
});

logger.info("Collector started", { deviceId: "abc" });
logger.error("Failed to fetch data", { url, retries });
```

---

## Design Principles

- **Framework-Agnostic Core**: Core logging never depends on React, Next.js, or Node APIs.
- **Composable & Extensible**: Easily add new transports, hooks, or formatters.
- **Centralized Control**: Central registry allows runtime adjustments without touching individual logger instances.
- **Minimal Core Overhead**: No storage, network, or external dependency assumptions.
- **Future-Ready**: Supports modern TypeScript workflows and upcoming framework adapters.
