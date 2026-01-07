# ts-logkit Refactor Plan

## Goal

Restructure the `ts-logkit` package so that consumers can import modules clearly:

```ts
import { Logger, createLoggerFactory } from "@buchanan-solutions/ts-logkit";
import { Registry } from "@buchanan-solutions/ts-logkit/registry";
import { InMemoryStore } from "@buchanan-solutions/ts-logkit/storage";
```

while keeping **one NPM package**, internal folder clarity, and clean separation of responsibilities.

---

## 1. Define Clear Boundaries

**`ts-logkit` currently mixes three responsibilities**. Separate them:

| Layer                                 | Responsibility                                  | Belongs in ts-logkit?                                      |
| ------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Core Logger                           | Logging runtime: levels, transports, formatters | ✅ Yes                                                     |
| Configuration Persistence             | Storing logger settings across reloads          | ✅ Interface only, implementations optional                |
| Live Instance Coordination (Registry) | Updating existing loggers at runtime            | ✅ Narrow: react to store updates, manage logger instances |

**Do not include:**

- Async resolution in core
- React hooks / lifecycle (`useLogger`)
- Specific storage implementations beyond `InMemoryStore` and `FileSystemStore` as well as `Store` interface
- Opinionated defaults

---

## 2. Project Structure (single package with folders)

```
ts-logkit/
├─ src/
│  ├─ core/        # Logger, LoggerFactory, Global utils, Formatters, Transports
│  ├─ registry/    # Registry class & helpers
│  ├─ storage/     # Store interface, InMemoryStore, FileSystemStore
│  ├─ index.ts     # Barrel export for top-level imports
├─ package.json
└─ tsconfig.json
```

### Barrel export pattern (`src/index.ts`)

```ts
export { Logger, createLoggerFactory } from "./core";
export { Registry } from "./registry";
export { InMemoryStore } from "./storage";
export type { Store } from "./storage";
```

**Internal folder barrels** (optional):

```ts
// src/registry/index.ts
export * from "./registry";
```

This allows both clean internal imports and public NPM API.

---

## 3. Core Layer (`core/`)

- Classes: `Logger`, `LoggerFactory`
- Utilities: `Global`, `devFormatter`, `consoleTransport`
- **Rule:** must be **sync**, framework-agnostic, and fast
- **No store, no async, no registry coupling**

---

## 4. Storage Layer (`storage/`)

- `Store` interface:

```ts
export interface Store {
  list(): Promise<SystemConfig>;
  get(id: string): Promise<LoggerStoreConfig>;
  set(cfg: LoggerStoreConfig): Promise<void>;
  subscribeAll?(cb: (cfg: LoggerStoreConfig) => void): () => void;
}
```

- Optional implementations: `InMemoryStore`, `FileSystemStore`
- **No React, Zustand, or async resolution logic**—just primitives

---

## 5. Registry Layer (`registry/`)

- Responsibilities:

  - Hold live logger instances
  - Listen to store updates
  - Update logger instances (e.g., `setLevel`)

- Must **not**:

  - Persist defaults
  - Block logger creation
  - Handle async lifecycle
  - Decide precedence

- Conceptual API:

```ts
registry.register(logger);
registry.unregister(id);
registry.attachStore(store);
```

- Internally reacts to store changes:

```ts
store.subscribeAll((cfg) => {
  const logger = map.get(cfg.id);
  if (logger) logger.setLevel(cfg.level);
});
```

---

## 6. Consumer Layer (outside `ts-logkit`)

- Handles **async, lifecycle, defaults, and framework integration**
- Example `useLogger` hook:

```ts
export function useLogger(id: string, runtimeDefaults) {
  const [logger, setLogger] = useState<Logger | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await store.get(id).catch(() => null);
      const level = stored?.level ?? runtimeDefaults?.level ?? FACTORY_DEFAULT;

      const l = loggerFactory.createLogger(id, { level });
      registry?.register(l);

      if (active) setLogger(l);
    })();

    return () => {
      active = false;
      registry?.unregister(id);
    };
  }, [id]);

  return logger ?? NoopLogger;
}
```

- All **async resolution and precedence logic** lives here

---

## 7. Concrete Refactor Steps

1. **Move everything under `src/` subfolders**: `core`, `registry`, `storage`.
2. **Keep `Logger` and `createLoggerFactory` in `core`**.
3. **Registry only manages live instances**. Remove store persistence and async from it.
4. **Store interface and simple `InMemoryStore`** live in `storage`.
5. **Move all React/Zustand/localStorage logic out**—consumer-side only.
6. **Update exports** via `index.ts` so top-level and folder imports work cleanly.
7. **Ensure registry never blocks logger creation**.

---

## 8. Mental Model & Benefits

- **ts-logkit = logging primitives + optional coordination**
- **Consumer = logging system** (async, persistence, lifecycle)
- Clear separation allows:

  - Node/browser/workers compatibility
  - Swappable persistence (Zustand, Redux, IndexedDB)
  - Fully sync logging if desired
  - No React or async contamination in core

---

## ✅ Final Outcome

- Imports:

```ts
import { Logger, createLoggerFactory } from "@buchanan-solutions/ts-logkit";
import { Registry } from "@buchanan-solutions/ts-logkit/registry";
import { InMemoryStore } from "@buchanan-solutions/ts-logkit/storage";
```

- Single NPM package
- Clear internal structure
- Minimal, framework-agnostic core
- Optional coordination and persistence separated cleanly

Here’s a clear **target use case description** for what you’re building in your Next.js project, using your current code and intentions as a concrete example:

---

# Target Use Case: Client-Side Logger Registry with Live Sync in Next.js

## Overview

The initial use-case that will consume from the ts-logkit is a NEXTJS Project that wants the following logger system:

1. Allows multiple loggers to be created dynamically across different pages and components.
2. Automatically synchronizes each logger’s configuration (e.g., log level) with a central **store**.
3. Uses a **singleton registry** in memory to coordinate live updates for all active logger instances.
4. Persists logger configurations to **localStorage** so log levels survive page reloads.
5. Cleans up the registry when loggers are unmounted to avoid stale instances.
6. Provides a **consumer-friendly hook** (`useLogger`) that encapsulates store lookup, registry registration, async resolution, and lifecycle management.

The following is example-code that is to be used as simple a reference for how this implementation could look - but is not to be taken as guiding designs or requirements or best-practices for the `ts-logkit` package itself. The consumer implementation will adapt to the API that the `ts-logkit` exposes and will adjust / accomodate any of the syntax / limitations it imposes.

---

## Concrete Architecture

### 1. **Logger Factory (ts-logkit)**

- Exposes `Logger` and `createLoggerFactory`.
- Fully **sync**, framework-agnostic.
- Does **not** depend on React, Zustand, or async resolution.
- Accepts an optional `Registry` to allow live updates.

**Example:**

```ts
export const loggerFactory = createLoggerFactory({
  transports: [createConsoleTransport()],
  formatter: devFormatter,
  registry,
  logConfig: { id: "ClientLoggerFactory", level: "error" },
});
```

---

### 2. **Store Layer (Zustand + localStorage)**

- Holds the **source of truth** for logger configurations.
- Implemented as a **Zustand store** with `persist` middleware (localStorage).
- Exposes a `Store` interface compatible with `ts-logkit.Registry`.
- Responsible for async get/set operations but **not logger instantiation**.

**Example:**

- `get(id)` → fetch config for a logger
- `set(cfg)` → update logger config
- `subscribeAll(cb)` → notify registry of changes

> This allows the registry to reactively update logger instances when config changes.

---

### 3. **Registry Layer (Singleton in Client Memory)**

- A single instance in the client-side bundle.
- Holds **all active loggers**.
- Reacts to store changes via `subscribeAll`:

  - Updates the log level of corresponding logger instances in real-time.

- Does **not** persist defaults or block logger creation.
- Works across pages/components in a SPA without reloading.

**Behavior:**

- Register a logger: `registry.register(logger)`
- Unregister a logger on unmount: `registry.unregister(id)`
- Attach the store once: `registry.attachStore(zustandLoggerStore)`

> Effectively acts as a **live cache / orchestrator** for loggers in memory.

---

### 4. **Consumer Hook (`useLogger`)**

- Encapsulates store lookup, async config resolution, logger creation, registry registration, and cleanup.
- Ensures that:

  1. Logger is **awaited until store value is resolved**.
  2. If no store value exists, uses a **runtime default** level.
  3. Logger is **registered to the registry** for live updates.
  4. On component unmount, logger is **removed from the registry** to prevent memory leaks.

**Example Flow:**

```ts
const logger = useLogger("MyComponentLogger", { level: "debug" });

// Internally:
1. Check zustandLoggerStore.get("MyComponentLogger")
2. If exists, use that config; else fallback to runtime default
3. Create logger with factory
4. registry.register(logger)
5. On unmount -> registry.unregister("MyComponentLogger")
```

---

### 5. **Lifecycle Across SPA Navigation**

- Navigating between pages/components creates/destroys loggers dynamically.
- Registry ensures **all live loggers** reflect the latest store configs immediately.
- Store persistence ensures **log levels survive reloads**.
- Consumer hook abstracts the complexity, so page components never need to manage store or registry directly.

---

### 6. **Tech Stack Choices**

| Layer              | Implementation                 | Notes                                               |
| ------------------ | ------------------------------ | --------------------------------------------------- |
| Logger Factory     | `ts-logkit` core               | Fully sync, reusable in Node/browser                |
| Store              | Zustand + `persist` middleware | LocalStorage persistence, async `get/set`           |
| Registry           | Singleton registry instance    | Sync logger updates across components/pages         |
| Hook (`useLogger`) | React hook in client           | Async-aware, coordinates factory + store + registry |

---

### 7. **Key Advantages**

- **Consistent log levels** across your app.
- **Live updates** to any logger if a config changes in the store.
- **Memory-safe**: old loggers removed on unmount.
- **Framework-friendly**: Next.js pages/components work seamlessly with multiple loggers.
- **SPA-compatible**: Works across navigation without reloading the page.
