# ts-logkit live updates — Requirements

**Change:** `ts-logkit-live-updates`  
**Package:** `@buchanan-solutions/ts-logkit`  
**OpenSpec path:** `openspec/changes/ts-logkit-live-updates/`

**Target consumer (behavior to enable):** `@core-mfg/ops-api` (and eos) — flip **one ancestor** at runtime (registry / store / later HTTP) so a domain slice goes noisy, then flip it back, **without** baking `{ level: 'debug' }` into call sites. Same spirit as Python `logging` + AI server `/loggers`.

**Out of scope for this change (call-site / later):** Ops-api/eos HTTP routes, env gates, second listen port, auth, Redis/Postgres stores, cascade/`*` batch APIs, [memoized effective level](./memoize-effective-level.md). Those consume the kit or are optional optimizations; they are not kit requirements for this change.

**Breaking:** `Logger.child()` MUST stop copying the parent’s concrete min-level. Call sites that relied on that copy need a glance (delete scattered `{ level: 'debug' }`; set ancestors via store/UI). Treat as a minor kit bump with a short migration note.

---

## 1. Purpose

Make ts-logkit’s hierarchy behave like Python: children default to **NOTSET**, `shouldLog` uses **effective level** (walk ancestors), and a live `setLevel` / registry update on **one id** immediately changes filtering for that logger and every descendant that is still NOTSET.

Registry + Store remain the persistence/live-instance seam. Kit does not prescribe HTTP or cascade-overwrite.

---

## 2. Locked decisions

| Topic | Decision |
|---|---|
| Inheritance | Python-style **NOTSET + ancestor walk**. Not copy-at-create. Not cascade `setLevel` on children. |
| Default for `child()` / new ids without store config | **NOTSET** (inherit). Do not copy parent’s current concrete level. |
| Explicit level | `setLevel(level)` or store/registry set for that **exact id** only. Descendants unchanged. |
| Clear / inherit again | Unset that id → NOTSET → walk resumes. |
| No `OFF` level | Quiet branch = explicit high level (`warn`/`error`/`fatal`), or **don’t `child()` under a loud parent** (sibling ids). |
| Loud parent, quiet tree | Not via NOTSET. Either different parent, or explicit quieter level on the branch roots you want muted. |
| Walk | Dotted ids: parent of `a.b.c` is `a.b`. Continue until a non-NOTSET configured/instance level, else process fallback (factory / `Global`). |
| Hot path | `shouldLog` / `getEffectiveLevel` are **sync**. They MUST NOT read the Store. Lookup = live logger + registry `_configCache` only. Cache miss = NOTSET (not a store fetch). |
| Store I/O | Only bootstrap, `update`/`unset`, and subscribe. Subscribe **pushes** into the cache; descendants inherit on the next walk. |
| Live instances | Factory+registry: singleton per id. `update` mutates that object’s **configured** level; descendants that are NOTSET pick it up on the **next** `shouldLog` via walk (no recreate). |
| Persistence | Store holds **explicit** `{ id, level }` only. Do **not** persist NOTSET children on register (that would stamp concrete levels and kill inherit). |
| Memoize effective | Out of this change. See [`memoize-effective-level.md`](./memoize-effective-level.md). |
| HTTP / `*` / cascade | Not in kit. If ops-api wants `runout.*`, it batch-sets explicit ids — orthogonal, usually unnecessary once NOTSET works. |
| Global floor | `Global.level` still AND-filters. Does not replace per-logger effective level. |
| Ownership | Kit: identity, NOTSET, walk, live update, store contract. Call sites: HTTP, which Store, which ids are “roots.” |

---

## 3. Requirements (kit)

### R1 — Configured vs effective level

Every logger SHALL have:

- **configured level:** a severity in `LEVELS`, or **NOTSET**
- **effective level:** first non-NOTSET configured level walking `id` → parent id → … → process fallback

`debug`/`info`/… SHALL filter against **effective** level (and `Global.level`), not against a copied min-level from create time.

Effective-level lookup SHALL be synchronous: live instance configured field and/or in-memory registry cache. SHALL NOT call `store.get` / `store.list` (or equivalent) on the emit path. A missing cache entry is NOTSET.

Inspect APIs SHALL expose both (list UIs need “this id is NOTSET, effective=debug via `ops-api.runout`”).

### R2 — `child()` inherits, does not stamp

`Logger.child(childId)` SHALL:

1. Use id `parentId.childId`
2. Share transports/formatter/hooks as today
3. Leave configured level **NOTSET** unless `opts.level` is an explicit severity (escape hatch)
4. Register via factory when present (singleton)

A later `setLevel` on the **parent** SHALL change effective level for NOTSET children **without** writing those children’s configured level.

### R3 — Live exact-id update (no cascade)

`Registry.update(id, level)` SHALL:

1. Validate `level` (explicit severity, not NOTSET — use clear/unset for inherit)
2. Cache + `setLevel` on the live instance if registered
3. Persist `{ id, level }` on the Store

`Registry` SHALL also support **unset** (`clear` / `update(id, null)` — exact shape in design): configured → NOTSET, drop store row (or persist absence), live instance if any.

Updating an id with no live instance SHALL still update cache/store so a later `createLogger` hydrates that **configured** level.

SHALL NOT `setLevel` on descendants.

### R4 — Factory + registry cohesion

When the factory has a registry:

- `createLogger(id)` returns the registered singleton or creates, registers, returns
- On register: if cache/store has an **explicit** level for `id`, apply it; else configured stays NOTSET (or the explicit `runtimeDefaults.level` if the caller passed one)
- SHALL NOT write NOTSET (or factory default) into the store just because a child was first created

Consumers MUST be able to:

```ts
const log = loggerFactory.createLogger('ops-api.runout')
await estimateRunout(client, input, log)
// inside: logger.child('estimateRunout') → ops-api.runout.estimateRunout (NOTSET)
```

Then `registry.update('ops-api.runout', 'debug')` makes `estimateRunout` debug logs emit; `unset('ops-api.runout')` or set back to `info` quiets them again if they are still NOTSET.

### R5 — Store contract

`Store` remains `list` / `get` / `set` / `setAll` + optional subscribe. Levels in the store are **explicit** severities.

Subscribe SHALL apply to the **named** logger’s configured level only (same as R3): patch **cache + that live instance**. Descendants follow via walk on the next `shouldLog`. SHALL NOT prefix-scan Redis/localStorage to resolve inheritance.

Store I/O is allowed only for:

- `bootstrap` (`list` → fill cache)
- `update` / `unset` (write / delete row)
- `subscribe` / `subscribeAll` (push into cache)

Future Redis/etc. is another Store; not this change. Hot-path walk stays process-local.

### R6 — Process fallback

If the entire ancestor chain is NOTSET, effective level SHALL be the factory default (today’s `createLoggerFactory({ level })`, typically `warn` / `LOG_LEVEL`) and still AND with `Global.level`.

There is no required synthetic `root` logger, but dotted walk MUST work even when intermediate parents were never instantiated (use **cache** + id prefix, not only live parent pointers, and not the Store).

### R7 — Non-goals (explicit)

Kit SHALL NOT:

- Add `OFF`
- Cascade-overwrite descendant configured levels
- Expose HTTP
- Couple to Next/Bun/ops-api
- Require children to re-pull/recreate to see a parent flip
- Read the Store from `shouldLog` / `getEffectiveLevel`
- Prefix-search a remote store to compute effective level
- Memoize effective level (follow-up: [`memoize-effective-level.md`](./memoize-effective-level.md))

---

## 4. Target behavior (ops-api / eos — acceptance)

HTTP wording is illustrative.

1. Domain call sites `child('estimateRunout')` with **no** `{ level: 'debug' }`.
2. Set `ops-api.runout` → `debug` (registry/store). Subsequent logs on `ops-api.runout` and NOTSET descendants emit debug. HTTP logger `ops-api.http` (sibling, not child) stays at process fallback / its own explicit level.
3. Unset or set `ops-api.runout` back to `info`/`warn`. NOTSET descendants go quiet. A descendant that was **explicitly** set to `debug` stays debug (and **its** NOTSET subtree stays noisy).
4. List loggers shows configured vs effective.
5. eos: one parent (or store id) to debug for a session; no source hunt to revert call-site levels.

---

## 5. Non-functional

- Parent flip is visible on the next `shouldLog` of NOTSET descendants (sync; no “next process restart”).
- Walk is O(depth of dots), not O(registry) per log line; each hop is an in-memory Map lookup.
- Emit path MUST NOT call the Store (test with a mock that fails if `get`/`list` run during `debug()`).
- Kit still works without registry/store (NOTSET + factory fallback only).
- Minor version + changelog: child level copy removed.
