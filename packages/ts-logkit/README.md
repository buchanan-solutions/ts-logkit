# @buchanan-solutions/ts-logkit

**A small, composable, framework-agnostic logging toolkit for TypeScript applications.**

`ts-logkit` provides a **structured, extensible logging core** designed to work consistently across Node.js, browser, and universal (SSR / edge) environments—without coupling your logging to any specific framework or backend.

It favors **clarity, explicitness, and extensibility** over hidden magic, making it suitable for libraries, applications, and long-lived systems where logging behavior must remain predictable over time.

---

## Table of Contents

- [Status](#-status)
- [What it is](#what-it-is)
- [What it is not](#what-it-is-not)
- [Why This Exists](#-why-this-exists)
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

- 🎨 **ANSI development formatter** (Node.js)
- 🌈 **Browser `%c` formatter** (CSS-styled console output)

Formatters are optional—transports may ignore them entirely.

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
  DevFormatter,
} from "@buchanan-solutions/ts-logkit";

const logger = new Logger({
  id: "collector",
  level: "debug",
  formatter: new DevFormatter(),
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

- `level`
- `message`
- `timestamp`
- optional `args`
- optional `error`

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
- 🔄 Optional store integration for dynamic level updates

---

### Store

A `Store` manages logger configurations for dynamic runtime updates.

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
}
```

Stores enable:

- 🔄 Runtime log level changes without restarting
- 💾 Persistence of logger configurations
- 📡 Remote configuration updates (via custom store implementations)
- 🔌 Optional subscription-based updates

**Important:** Stores only contain serializable data (logger `id` and `level`). Runtime objects like transports, formatters, and hooks are not stored and remain runtime-only.

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

#### Programmatic API

You can also control logging programmatically using the global functions:

```ts
import { Global } from "@buchanan-solutions/ts-logkit";

// Disable logging globally
Global.setLoggingEnabled(false);

// Check if logging is enabled
if (Global.isLoggingEnabled()) {
  // Logging is active
}

// Re-enable logging
Global.setLoggingEnabled(true);

// Set global minimum log level
Global.setLogLevel("debug");

// Get current global log level
const currentLevel = Global.getLogLevel();
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
  DevFormatter,
  InMemoryStore,
} from "@buchanan-solutions/ts-logkit";

const store = new InMemoryStore();

const factory = createLoggerFactory({
  transports: [createConsoleTransport()],
  formatter: new DevFormatter(),
  level: "info",
  store, // Optional: enables dynamic level updates
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

---

### Store System for Dynamic Configuration

Stores enable runtime log level changes without restarting your application:

```ts
import {
  Logger,
  createConsoleTransport,
  DevFormatter,
  InMemoryStore,
} from "@buchanan-solutions/ts-logkit";

// Create a store
const store = new InMemoryStore();

// Create logger with store
const logger = new Logger(
  {
    id: "my-service",
    level: "warn",
    transports: [createConsoleTransport()],
    formatter: new DevFormatter(),
  },
  store // Pass store to enable dynamic updates
);

// Later, update log level dynamically
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
- **Optional subscriptions:** Stores can implement `subscribe()` for real-time updates
- **Persistence ready:** Implement custom stores for localStorage, Redis, databases, etc.
- **Runtime-safe:** Store failures never break logging

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
class JsonFormatter {
  format(event: Event) {
    return JSON.stringify(event);
  }
}
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

## 📄 License

MIT
