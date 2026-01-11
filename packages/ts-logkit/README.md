# @buchanan-solutions/ts-logkit

**A small, composable, framework-agnostic logging toolkit for TypeScript applications.**

`ts-logkit` provides a **structured, extensible logging core** designed to work consistently across Node.js, browser, and universal (SSR / edge) environments—without coupling your logging to any specific framework or backend.

It favors **clarity, explicitness, and extensibility** over hidden magic, making it suitable for libraries, applications, and long-lived systems where logging behavior must remain predictable over time.

---

## 🚀 Quick Start

Add a .npmrc to your consuming repository to connect @buchanan-solution packge space to github (currently only published to npm.pkg.github not true npm yet):

```bash
@buchanan-solutions:registry=https://npm.pkg.github.com
```

Add to project package.json normally:

Manually add to package.json:

```bash
"@buchanan-solutions/ts-logkit": "0.1.0"
```

Add with npm:

```bash
npm install @buchanan-solutions/ts-logkit@0.1.0
```

Add with pnpm:

```bash
pnpm add @buchanan-solutions/ts-logkit@0.1.0
```

---

## Table of Contents

- [Status](#-status)
- [What it is](#what-it-is)
- [What it is not](#what-it-is-not)
- [Why This Exists](#-why-this-exists)
- [Client-Side Logging Philosophy](#-client-side-logging-philosophy)
- [Key Features](#-key-features)
  - [Structured Logger Instances](#structured-logger-instances)
  - [Rich Log Levels](#rich-log-levels)
  - [Pluggable Transports](#pluggable-transports)
  - [Formatter Layer](#formatter-layer)
  - [Hook System (Side Effects)](#hook-system-side-effects)
  - [Logger Factory](#logger-factory)
  - [Store System](#store-system)
  - [Environment-Safe by Design](#environment-safe-by-design)
- [Design Principles](#-design-principles)
- [Quick Start](#-quick-start)
  - [Install](#install)
  - [Basic Usage](#basic-usage)
- [Core Concepts](#-core-concepts)
  - [Logger](#logger)
  - [Event](#event)
  - [Formatter](#formatter)
  - [Transport](#transport)
  - [Hook](#hook)
  - [Factory](#factory)
  - [Store](#store)
- [Architecture Overview](#-architecture-overview)
- [Environment Support](#-environment-support)
- [Advanced Usage](#-advanced-usage)
  - [Disabling Logging via Environment Variables](#disabling-logging-via-environment-variables)
  - [Logger Factory](#logger-factory-1)
  - [Store System for Dynamic Configuration](#store-system-for-dynamic-configuration)
  - [Multiple Transports](#multiple-transports)
  - [Custom Formatter](#custom-formatter)
  - [Hooks for Telemetry](#hooks-for-telemetry)
- [Roadmap](#-roadmap)
- [FAQ / Design Notes](#-faq--design-notes)
- [License](#-license)

---

## 📊 Status

> **Early public release / stable core API**

The core logging primitives are stable and used internally.
Framework adapters and persistence integrations are planned and will live in separate packages.

---

## What it is

A **minimal, typed logging core** built around a small set of explicit concepts:

- 📝 Loggers
- 📊 Log events
- 🎨 Formatters
- 🚚 Transports
- 🪝 Hooks
- 🏭 Factories
- 💾 Stores

The core is intentionally **framework-agnostic** and **side-effect free by default**.

### What it is not

- ❌ A hosted logging service
- ❌ A bundled observability platform
- ❌ Opinionated about storage, networking, or vendors

Those concerns are handled via **transports, hooks, or adapters**, not baked into the core.

---

## 🎯 Why This Exists

Most logging libraries fall into one of two categories:

1. **Too simple** — console wrappers that don’t scale beyond debugging
2. **Too opinionated** — tightly coupled to platforms, storage, or frameworks

`ts-logkit` sits deliberately in between:

- 📊 You get **structured events**, not just strings
- 🎛️ You keep **full control over where logs go**
- 🔧 You can extend behavior **without forking the logger**

The result is a logging layer that scales from:

- 🐛 local dev debugging
- 📈 to production telemetry
- 📦 to SDKs embedded in other systems

…without changing your call sites.

---

## 🎭 Client-Side Logging Philosophy

`ts-logkit` distinguishes between three fundamentally different logging use cases:

### Telemetry & Metrics

- 📊 Aggregated, anonymized usage data
- 📈 Intended for analytics and monitoring pipelines
- 🔌 Implemented via transports or hooks (not console output)

### Error & Fatal Logging

- 🚨 Unhandled exceptions and critical failures
- 🌐 Typically sent to centralized backends (Sentry, APIs, databases)
- 📋 Structured events with context and optional stack traces

### Developer Flow Logging

- 🐛 Debug- and info-level logs used during development
- 🔍 Focused on execution flow, component lifecycle, and state
- ⚙️ Usually disabled or heavily filtered in production

`ts-logkit` intentionally keeps these concerns **separate but composable**, allowing teams to enable only what makes sense per environment.

---

## ✨ Key Features

### Structured Logger Instances

- 🏷️ Explicit logger identity (`id`)
- 📂 Optional logger categorization (`type`)
- 📊 Per-logger minimum log level
- 🔷 Fully typed events (`Event`, `Level`)

---

### Rich Log Levels

Supported levels:

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

Levels are ordered and numerically comparable, enabling predictable filtering.

> Default level is `warn` by design—quiet by default, explicit when noisy.

---

### Pluggable Transports

Transports receive the **full log event**, not just a formatted string.

This enables:

- 🖥️ Console output
- 📁 File writers
- 🌐 Network senders
- 📊 Telemetry exporters
- 🔌 Third-party logging adapters

Multiple transports can be combined safely.

---

### Formatter Layer

Formatters convert a structured `Event` into displayable output.

Included formatters:

- 🎨 **Development formatter** (`devFormatter`) - ANSI color codes for Node.js terminal output

Formatters are optional—transports may ignore them entirely. You can create custom formatters for browser environments or other use cases.

---

### Hook System (Side Effects)

Hooks run **after emission** and receive the raw event.

Use hooks for:

- 📈 Metrics
- 📊 Analytics
- 🚨 Error reporting
- 📝 Audit trails

Hooks support async execution and **never block logging**.

---

### Logger Factory

Create multiple loggers with shared configuration:

- 🏭 Centralized transport, formatter, and hook setup
- 🔄 Consistent configuration across loggers
- 📊 Optional store integration for dynamic updates

---

### Store System

Dynamic logger configuration management:

- 🔄 Runtime log level updates without restart
- 💾 Persistence of logger configurations
- 📡 Optional subscription-based real-time updates
- 🔌 Pluggable store implementations (in-memory, localStorage, Redis, etc.)

Stores only contain serializable data (`id`, `level`); runtime objects remain runtime-only.

---

### Environment-Safe by Design

- ✅ No Node-only APIs in the core
- 🌐 Browser-safe formatters available
- 🔄 Works in SSR and universal runtimes

---

## 🏗️ Design Principles

- **Framework-Agnostic Core**
  No React, Next.js, Node, or browser dependencies.

- **Explicit Over Implicit**
  No hidden globals or auto-configuration.

- **Composable, Not Config-Heavy**
  Behavior is built by composition, not flags.

- **Fail-Safe Logging**
  Logging should never crash your application.

- **Minimal Core Surface Area**
  Extensions live outside the core package.

---

## 🚀 Quick Start

### Install

```bash
pnpm add @buchanan-solutions/ts-logkit
```

### Basic Usage

```ts
import {
  Logger,
  createConsoleTransport,
  devFormatter,
} from "@buchanan-solutions/ts-logkit";

const logger = new Logger({
  id: "collector",
  level: "debug",
  formatter: devFormatter,
  transports: [createConsoleTransport()],
});

logger.info("Collector started", { deviceId: "abc" });
logger.error("Failed to fetch data", new Error("Timeout"));
```

---

## 📚 Core Concepts

### Logger

A `Logger` is a lightweight object responsible for:

- 🔍 Level filtering
- 📤 Emitting events
- 🔀 Fan-out to transports
- 🪝 Triggering hooks

Loggers are cheap to create and safe to share.

---

### Event

An `Event` is a structured object containing:

- `logger_id` - The ID of the logger that emitted the event
- `level` - The log level
- `message` - The log message
- `timestamp` - Unix timestamp (milliseconds)
- `args` (optional) - Console-style arguments
- `error` (optional) - Error object if present

All transports and hooks operate on this same shape.

---

### Formatter

A `Formatter` transforms an `Event` into displayable output.

```ts
interface Formatter {
  format(event: Event): FormattedOutput;
}
```

Formatters are intentionally simple and synchronous.

---

### Transport

A `Transport` decides **what to do with a log event**.

```ts
interface Transport {
  log(event: Event, formatter?: Formatter): void;
}
```

Transports may:

- 🎨 Format
- 📦 Serialize
- 💾 Persist
- 🌐 Send over the network
- ⏭️ Or ignore formatting entirely

---

### Hook

A `Hook` observes events and performs side effects.

```ts
interface Hook {
  onLog(event: Event): void | Promise<void>;
}
```

Hook failures are isolated and never interrupt logging.

---

### Factory

A `LoggerFactory` creates multiple loggers with shared configuration.

```ts
interface LoggerFactory {
  createLogger(
    id: string,
    overrides?: { level?: Level; type?: string }
  ): Logger;
}
```

Factories enable:

- 🏭 Creating loggers with consistent transports, formatters, and hooks
- 📊 Centralized configuration management
- 🔄 Optional registry integration for dynamic level updates via stores

---

### Store

A `Store` manages logger configurations for dynamic runtime updates. Stores are used via the `Registry` class.

```ts
interface Store {
  list(): Promise<SystemConfig>;
  setAll(configs: SystemConfig): Promise<void>;
  get(name: string): Promise<LoggerStoreConfig>;
  set(config: LoggerStoreConfig): Promise<void>;
  subscribe?(
    name: string,
    callback: (config: LoggerStoreConfig) => void
  ): () => void;
  subscribeAll?(callback: (config: LoggerStoreConfig) => void): () => void;
}
```

Stores enable:

- 🔄 Runtime log level changes without restarting
- 💾 Persistence of logger configurations
- 📡 Remote configuration updates (via custom store implementations)
- 🔌 Optional subscription-based updates (per-logger or system-wide)

**Important:** Stores only contain serializable data (logger `id` and `level`). Runtime objects like transports, formatters, and hooks are not stored and remain runtime-only.

### Registry

A `Registry` manages logger lifecycle and applies store configurations to registered loggers. The registry is used with factories to enable dynamic configuration updates.

```ts
const registry = new Registry();
const store = new InMemoryStore();

// Bootstrap registry with store (must be awaited before creating loggers)
await registry.bootstrap(store);

const factory = createLoggerFactory({
  // ... config
  registry, // Loggers created by factory will be registered
});
```

The registry automatically:

- Loads all store configurations into a local cache during bootstrap
- Applies cached configurations to registered loggers synchronously
- Subscribes to store updates and updates loggers in real-time
- Manages logger lifecycle (register/unregister)

**Bootstrap Pattern:** The `bootstrap()` method loads all configurations from the store into a local cache, enabling fully synchronous logger creation. This eliminates async/sync friction and ensures loggers start with the correct level immediately.

---

## 🏛️ Architecture Overview

High-level flow:

```
Logger
  ├─ level filter
  ├─ emit Event
  ├─ Transports (fan-out)
  └─ Hooks (async, fail-safe)
```

Key guarantees:

- Transports receive the same event
- Hooks do not block transports
- Formatter is optional and injectable

---

## 🌍 Environment Support

| Environment     | Supported                |
| --------------- | ------------------------ |
| Node.js         | ✅                       |
| Browser         | ✅                       |
| SSR / Universal | ✅                       |
| Edge runtimes   | ✅ (formatter-dependent) |

---

## 🔧 Advanced Usage

### Disabling Logging Globally

You can globally disable logging at runtime using environment variables or programmatic API. This is useful for production deployments or testing scenarios where you want to suppress all logging output.

#### Environment Variables

##### Node.js / Server-Side

Use the `TS_LOGKIT_DISABLED` environment variable:

```bash
# Disable logging
TS_LOGKIT_DISABLED=1
# or
TS_LOGKIT_DISABLED=true

# Enable logging (if disabled)
TS_LOGKIT_DISABLED=0
# or
TS_LOGKIT_DISABLED=false
```

##### Browser / Next.js Client-Side

For browser environments and Next.js client-side code, use the `NEXT_PUBLIC_TS_LOGKIT_DISABLED` environment variable:

```bash
# Disable logging
NEXT_PUBLIC_TS_LOGKIT_DISABLED=1
# or
NEXT_PUBLIC_TS_LOGKIT_DISABLED=true

# Enable logging (if disabled)
NEXT_PUBLIC_TS_LOGKIT_DISABLED=0
# or
NEXT_PUBLIC_TS_LOGKIT_DISABLED=false
```

**Accepted values:**

- `"1"` or `"true"` → disables logging
- `"0"` or `"false"` → enables logging
- Unset or any other value → no change (defaults to enabled)

The environment variable check happens automatically when the `init.ts` module is imported. The logging state is set globally and affects all logger instances.

##### Global Log Level via Environment Variable

You can also set a global minimum log level using environment variables:

**Node.js / Server-Side:**

```bash
TS_LOGKIT_LEVEL=debug
```

**Browser / Next.js Client-Side:**

```bash
NEXT_PUBLIC_TS_LOGKIT_LEVEL=debug
```

**Accepted values:** `trace`, `debug`, `info`, `warn`, `error`, `fatal`

The global log level acts as an additional filter—loggers will only emit events that meet both their own level threshold and the global level threshold.

#### Programmatic API

You can also control logging programmatically using the Global class properties:

```ts
import { Global } from "@buchanan-solutions/ts-logkit";

// Disable logging globally
Global.enabled = false;

// Check if logging is enabled
if (Global.enabled) {
  // Logging is active
}

// Re-enable logging
Global.enabled = true;

// Set global minimum log level
Global.level = "debug";

// Get current global log level
const currentLevel = Global.level;
```

**Use cases:**

- Runtime configuration based on feature flags
- Conditional logging in tests
- Dynamic control based on user preferences or environment detection

---

### Logger Factory

Use a factory to create multiple loggers with shared configuration:

```ts
import {
  createLoggerFactory,
  createConsoleTransport,
  devFormatter,
  Registry,
  InMemoryStore,
} from "@buchanan-solutions/ts-logkit";

// Create a registry for dynamic configuration (optional)
const registry = new Registry();
const store = new InMemoryStore();

// Bootstrap registry with store (must be awaited before creating loggers)
await registry.bootstrap(store);

const factory = createLoggerFactory({
  transports: [createConsoleTransport()],
  formatter: devFormatter,
  level: "info",
  registry, // Optional: enables dynamic level updates via registry
});

// Create loggers with shared config
const apiLogger = factory.createLogger("api");
const dbLogger = factory.createLogger("database", { level: "debug" });
const authLogger = factory.createLogger("auth", { type: "security" });
```

**Benefits:**

- Consistent configuration across loggers
- Centralized transport/formatter/hook management
- Easy to create many loggers with similar setup
- Optional registry integration for dynamic configuration updates

---

### Store System for Dynamic Configuration

Stores enable runtime log level changes without restarting your application. Stores are used via the `Registry` class, which manages logger lifecycle and dynamic configuration.

```ts
import {
  createLoggerFactory,
  createConsoleTransport,
  devFormatter,
  Registry,
  InMemoryStore,
} from "@buchanan-solutions/ts-logkit";

// Create a registry and store
const registry = new Registry();
const store = new InMemoryStore();

// Bootstrap registry with store (must be awaited before creating loggers)
await registry.bootstrap(store);

// Create factory with registry
const factory = createLoggerFactory({
  transports: [createConsoleTransport()],
  formatter: devFormatter,
  level: "warn",
  registry, // Registry will manage loggers and apply store configs
});

// Create logger - it will be automatically registered with cached config
const logger = factory.createLogger("my-service");

// Later, update log level dynamically via store
await store.set({ id: "my-service", level: "debug" });
// Logger automatically updates its level if store supports subscriptions

// Or update all loggers at once
await store.setAll([
  { id: "my-service", level: "debug" },
  { id: "another-service", level: "info" },
]);
```

**Store Features:**

- **Serializable only:** Stores only persist `id` and `level` (no functions/objects)
- **Optional subscriptions:** Stores can implement `subscribe()` or `subscribeAll()` for real-time updates
- **Persistence ready:** Implement custom stores for localStorage, Redis, databases, etc.
- **Runtime-safe:** Store failures never break logging
- **Registry integration:** Registry automatically applies store configs to registered loggers

**Creating Custom Stores:**

```ts
import {
  Store,
  LoggerStoreConfig,
  SystemConfig,
} from "@buchanan-solutions/ts-logkit";

class LocalStorageStore implements Store {
  private key = "ts-logkit-config";

  async list(): Promise<SystemConfig> {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : [];
  }

  async setAll(configs: SystemConfig): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(configs));
  }

  async get(name: string): Promise<LoggerStoreConfig> {
    const configs = await this.list();
    const config = configs.find((c) => c.id === name);
    if (!config) throw new Error(`Logger ${name} not found`);
    return config;
  }

  async set(config: LoggerStoreConfig): Promise<void> {
    const configs = await this.list();
    const index = configs.findIndex((c) => c.id === config.id);
    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.push(config);
    }
    await this.setAll(configs);
  }

  // Optional: implement subscribeAll for real-time updates
  subscribeAll?(callback: (config: LoggerStoreConfig) => void): () => void {
    // Implementation for listening to localStorage changes
    // Return unsubscribe function
    return () => {};
  }
}
```

---

### Multiple Transports

```ts
import { combineTransports } from "@buchanan-solutions/ts-logkit";

const transport = combineTransports(createConsoleTransport(), customTransport);
```

---

### Custom Formatter

```ts
import { Formatter, Event } from "@buchanan-solutions/ts-logkit";

class JsonFormatter implements Formatter {
  format(event: Event) {
    return JSON.stringify(event);
  }
}

// Use it
const logger = new Logger({
  id: "my-logger",
  formatter: new JsonFormatter(),
  transports: [createConsoleTransport()],
});
```

---

### Hooks for Telemetry

```ts
const hook = {
  onLog(event) {
    if (event.level === "error") {
      sendToMonitoring(event);
    }
  },
};
```

---

## 🗺️ Roadmap

Planned additions (non-breaking):

- 📋 Logger registry (store system provides runtime level overrides ✅)
- ⚡ Next.js adapter
- 💾 Additional persistence providers (localStorage, Redis) - store interface ready, implementations coming
- 🌐 Remote telemetry transport
- 🛠️ Devtools integration

---

## ❓ FAQ / Design Notes

### Why is the default log level `warn`?

Quiet systems surface problems more clearly.
Explicit logging is a feature, not a burden.

---

### Why no built-in persistence?

Persistence strategies vary wildly by environment.
The core stays neutral; adapters handle specifics.

---

### Why hooks instead of middleware?

Hooks are simpler, safer, and harder to misuse in logging paths.

---

### Why do browser logs show the logger's file instead of the component?

In browser environments, file and line numbers are tied to the function that directly calls `console.*`.

When logging is centralized through a logger wrapper:

- The call site becomes the logger implementation
- Not the component that invoked `logger.info(...)`

This is a **fundamental browser limitation**—not a bug.

**Design decision:**

`ts-logkit` prioritizes structured events, consistency, and transport flexibility. Perfect call-site preservation is not possible when wrapping `console`.

For cases where file/line visibility is critical during development, direct `console.log(...)` usage is acceptable and expected.

---

## 📄 License

MIT
