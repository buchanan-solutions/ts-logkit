# @buchanan-solutions/ts-logkit

Composable TypeScript logging for Node, browsers, and SSR — structured events, pluggable transports, and Python-style level inheritance.

**Current version:** `0.4.0`

---

## Spirit

If you’ve ever typed `logging.getLogger("a.b.c")` in Python and felt a quiet little *yes* — this kit is for that feeling.

Same muscle memory: dotted names, children that inherit until you pin them, flip one ancestor and a whole subtree wakes up (or shuts up) without hunting the repo for leftover `{ level: "debug" }`. No ceremony, no framework religion — just loggers you can reason about at 2am.

We didn’t invent logging. We just missed Python’s and wanted it in TypeScript.

## Install

GitHub Packages (add an `.npmrc` in the consuming repo):

```
@buchanan-solutions:registry=https://npm.pkg.github.com
```

```bash
pnpm add @buchanan-solutions/ts-logkit@^0.4.0
```

---

## 60-second start

```ts
import {
  createLoggerFactory,
  createConsoleTransport,
  devFormatter,
  setDefaultFactory,
  getLogger,
} from "@buchanan-solutions/ts-logkit";

// 1. Boot once — wire transports + process default level
const factory = createLoggerFactory({
  transports: [createConsoleTransport()],
  formatter: devFormatter,
  level: "info", // factory default when a logger inherits all the way up
});

setDefaultFactory(factory);

// 2. Anywhere later — dotted ids, like Python logging
const log = getLogger("ops-api.http");
log.info("ready");

// Or keep a parent in hand:
const root = factory.createLogger("ops-api", { level: "info" }); // explicit pin
const http = root.child("http"); // NOTSET → inherits ops-api → info
http.debug("only visible after you raise ops-api (or this child) to debug");
```

`getLogger` / `createLogger` / `child()` return the **same singleton** per id when a registry is attached (and still share config via the factory when it is not).

---

## Configured vs effective level

Every logger has two level concepts:

| Concept | API | Meaning |
|---|---|---|
| **Configured** | `logger.configuredLevel` | `'notset'` **or** a severity you pinned |
| **Effective** | `logger.level` / `getEffectiveLevel()` | What `debug`/`info`/… actually filter against |

Rules (same idea as Python’s `logging`):

1. If configured is a severity → that is the effective level.
2. If configured is `'notset'` → walk parents (`a.b.c` → `a.b` → `a`) until a pin is found.
3. If the whole chain is NOTSET → use the **factory default** (`createLoggerFactory({ level })`).
4. `Global.level` is still AND-ed as a process floor.

```ts
root.setLevel("warn");   // pin
root.clearLevel();       // back to NOTSET / inherit
```

**Breaking in 0.4:** `child()` no longer copies the parent’s concrete level. Children default to NOTSET and inherit live. Pass `{ level: "debug" }` only when you intentionally pin that child.

---

## Recommended app boot (registry + store)

Use this when you want runtime flips (HTTP admin, UI, REPL) without redeploying:

```ts
import {
  createLoggerFactory,
  createConsoleTransport,
  devFormatter,
  Registry,
  InMemoryStore,
  setDefaultFactory,
  getLogger,
  type Level,
  LEVELS,
} from "@buchanan-solutions/ts-logkit";

const registry = new Registry();
await registry.bootstrap(new InMemoryStore());

const bootLevel = (
  LEVELS.includes((process.env.LOG_LEVEL as Level) ?? "info")
    ? process.env.LOG_LEVEL
    : "info"
) as Level;

const factory = createLoggerFactory({
  transports: [createConsoleTransport()],
  formatter: devFormatter,
  level: bootLevel,
  registry,
});

setDefaultFactory(factory);

// Pin the service root so children have something concrete to inherit
factory.createLogger("ops-api", { level: bootLevel });
registry.update("ops-api", bootLevel);

// Later, anywhere:
getLogger("ops-api.runout").info("estimating");

// Live flip — exact id only; NOTSET descendants pick it up on the next log line
registry.update("ops-api.runout", "debug");
registry.unset("ops-api.runout"); // inherit again

// Inspect for UIs
registry.listLevels();
// → [{ id, configured: 'notset' | Level, effective: Level }, ...]
```

Important store rules:

- Store rows are **explicit** severities only.
- Creating / registering a NOTSET child does **not** write the store.
- `shouldLog` / `getEffectiveLevel` never read the Store (cache + live instances only).

---

## Core pieces

| Piece | Role |
|---|---|
| **Logger** | Filters by effective level, emits `Event`s to transports, runs hooks |
| **Factory** | Shared transports/formatter/hooks; `createLogger` / `getLogger`; `defaultLevel` |
| **Registry** | Singletons per id; `update` / `unset`; cache for live flips |
| **Store** | Persist explicit `{ id, level }` (`InMemoryStore`, `FileSystemStore`, …) |
| **Transport** | Where events go (console, file, network, …) |
| **Formatter** | How events look (`devFormatter`, browser formatter, custom) |
| **Hook** | Side effects after emit (metrics, Sentry, …) — never blocks logging |

Levels: `trace` < `debug` < `info` < `warn` < `error` < `fatal`. There is no `OFF` — quiet a branch with an explicit high level, or don’t nest under a loud parent (use a sibling id).

---

## API cheat sheet

```ts
// Factory
createLoggerFactory(config) → LoggerFactory
factory.createLogger(id, opts?)
factory.getLogger(id, opts?)          // alias
factory.defaultLevel
factory.registry?

// Process default (optional Python feel)
setDefaultFactory(factory)            // or undefined to clear
getLogger(id, opts?)                  // throws if no default factory

// Logger
logger.configuredLevel                // Level | 'notset'
logger.level                          // effective Level
logger.getEffectiveLevel()
logger.setLevel(level)                // pin
logger.clearLevel()                   // NOTSET
logger.child(childId, opts?)          // id = parent.childId; default NOTSET

// Registry
await registry.bootstrap(store)
registry.update(id, level)            // pin + persist
registry.unset(id)                    // NOTSET + drop store row
registry.listLevels()
registry.get(id) / getAll() / has(id)
```

Env globals (optional): `TS_LOGKIT_DISABLED`, `TS_LOGKIT_LEVEL` (see package init).

---

## Migration from 0.3 → 0.4

1. **`child()` inherit** — delete scattered `{ level: "debug" }` meant only to “see a subtree”; pin an ancestor via `setLevel` / `registry.update` instead.
2. **`.level` is effective** — for “did I pin this?”, use `configuredLevel`.
3. **Register no longer persists** every new logger into the store — call `update` when you want a durable pin.
4. **Additive APIs** — `getLogger`, `setDefaultFactory`, `clearLevel`, `configuredLevel`, `getEffectiveLevel`, `registry.unset`, `listLevels`.

---

## Testing

```ts
import { NoopLogger } from "@buchanan-solutions/ts-logkit";
import { createMockLogger } from "@buchanan-solutions/ts-logkit/testing";
```

Vitest helpers live under `@buchanan-solutions/ts-logkit/testing` (optional peer: `vitest`).

---

## What this is / isn’t

**Is:** a small typed logging core for libraries and apps.  
**Isn’t:** a hosted log platform, Redis, or an HTTP admin API — those are consumers (your app wraps `Registry.update` / `listLevels`).

---

## License

MIT
