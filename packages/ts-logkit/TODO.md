# ts-logkit TODO

## 0.0.1

### Core cleanup

- [x] Scrap anything related to “verbose errors” or “error verbosity”; error objects are always user-controlled and passed explicitly
- [ ] Normalize log event shape to ensure stable keys for registry consumers (level, name, timestamp, context, error)

---

### Central Logger Registry (framework-agnostic)

> Goal: enable consumer frameworks (e.g. Next.js) to **persist, restore, and dynamically update logger configuration**, without coupling `ts-logkit` to any storage or framework.

- [ ] Introduce a **central in-memory logger registry** in `ts-logkit` core

  - Tracks logger instances by name
  - Exposes readonly metadata (name, current level)
  - Does **not** perform persistence itself

- [ ] Add a **registry API** (core, framework-agnostic):

  - `registerLogger(logger)`
  - `getLogger(name)`
  - `getAllLoggers()`
  - `setLoggerLevel(name, level)`
  - `setAllLoggerLevels(level)`

- [ ] Ensure registry updates propagate to existing logger instances at runtime

- [ ] Ensure registry is safe to use in both browser and Node environments

- [ ] Prevent registry from importing or referencing:

  - storage APIs
  - fetch
  - Next.js / React primitives

---

### Config Provider Abstraction (core contract)

> This replaces the old “logging config + storage” coupling with a clean boundary.

- [ ] Define a **`LoggerConfigProvider` interface** in core:

  ```ts
  interface LoggerConfigProvider {
    load(): Promise<LoggerConfig[]>;
    persist(config: LoggerConfig[]): Promise<void>;
    subscribe?(cb: (config: LoggerConfig[]) => void): () => void;
  }
  ```

- [ ] Define a minimal `LoggerConfig` shape:

  - logger name
  - log level
  - (optional) future metadata

- [ ] Allow the registry to:

  - hydrate logger levels from a provider
  - notify the provider when levels change

> Core must depend only on the **interface**, never on an implementation.

---

### Browser / Next.js Use Case Enablement (via adapters)

> Implemented **outside** core, but enabled by it.

- [ ] Design registry APIs to support:

  - client-side persistence (localStorage)
  - rehydration on page load
  - live log-level toggling in dev tools / UI

- [ ] Document a reference implementation:

  - `LocalStorageLoggerConfigProvider`
  - used by `ts-logkit-next` (not core)

- [ ] Support late hydration (loggers created before config loads)

---

### Non-Goals for 0.0.1 (Explicitly Deferred)

- [ ] ❌ Server-side logger registration
- [ ] ❌ Redis / file-based config persistence
- [ ] ❌ Cross-process shared logging state
- [ ] ❌ Remote admin UI or REST config endpoints

These remain **future milestones**, not blockers.
