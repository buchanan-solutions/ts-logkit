# ts-logkit NOTSET / effective level — Design

**Change:** `ts-logkit-live-updates`  
**Implements:** [`requirements.md`](./requirements.md)

This is a **kit** design. Ops-api/eos HTTP and Stores stay consumers.

---

## 1. Problem (today)

`Logger.child()` **copies** `parent._minLevel` into a new singleton. Registry `update(id)` only `setLevel`s **that** instance.

Consequences:

- Call sites pass `{ level: 'debug' }` to see a subtree, then hunt the repo to quiet it.
- Flipping a parent does not change warm children.
- `register()` persists every new logger’s concrete level into the store — that would **stamp** children and fight inherit if we only added cascade.

Python does not work that way. We want the same: **unset means inherit; explicit means pin.**

---

## 2. Target model

```text
configured(id)  = NOTSET | trace|debug|info|warn|error|fatal
effective(id)   = configured(id) if not NOTSET
                  else effective(parent(id))
                  else factoryDefault   // AND Global.level at emit time
```

`parent('a.b.c')` = `'a.b'`. `parent('a')` = none (hit factory default). Intermediate names need **not** be constructed as Logger objects.

```text
ops-api                    explicit info     (LOG_LEVEL / factory)
├── ops-api.http           NOTSET            → effective info
└── ops-api.runout         explicit debug    (runtime update)
    └── …estimateRunout    NOTSET            → effective debug
        └── …inner         NOTSET            → effective debug
```

Unset `ops-api.runout` → those descendants go back to walking until `ops-api` (info).  
If `…estimateRunout` was explicitly `debug`, it **and** its NOTSET children stay debug when the parent goes quiet.

No `OFF`. Mute a branch with explicit `warn`/`error`, or don’t nest under the loud id.

---

## 3. Code changes (where)

| Area | File (kit) | Change |
|---|---|---|
| Level | `src/core/types/level.ts` | Add `NotSet` / `'notset'` **or** `configuredLevel: Level \| null`. Prefer **`Level` stays severities**; configured type = `Level \| 'notset'` (or `undefined` internally). Store omits row = notset. |
| Filter | `Logger.shouldLog` / `shouldLog()` | Compare event level to **`getEffectiveLevel()`**, then `Global.level`. |
| Child | `Logger.child()` | Stop `level: opts?.level ?? this._minLevel`. Default configured **notset**. Keep sharing transports/formatter/hooks. Still `factory.createLogger(fullId, …)`. |
| Logger API | `logger.ts`, `loggerLike.ts` | `configuredLevel` (or `level` = configured). Add `getEffectiveLevel(): Level`. `setLevel(Level)` sets explicit. `clearLevel()` → notset. |
| Registry | `registry.ts` | `update` = exact id only. Add `unset(id)`. Cache: missing key = notset. **Do not persist on register** unless configured is explicit. Subscribe still `setLevel` on **that** id only. |
| Factory | `factory.ts` | Create with notset unless `runtimeDefaults.level` is a real severity or cache has explicit. Return singleton as today. |
| Store | `store.ts` | Unchanged shape. Convention: no row / delete row = notset. `set({ id, level })` always explicit severity. Optional later: `delete(id)` on Store — if not added, registry `unset` can `setAll` without that id. |

`Global.level` unchanged (process floor).

---

## 4. Effective-level walk (practical)

Do **not** require a parent pointer on Logger (ids can be created out of order). Walk **strings**:

```ts
function ancestorIds(id: string): string[] {
  // 'ops-api.runout.est' → ['ops-api.runout.est', 'ops-api.runout', 'ops-api']
  const parts = id.split('.')
  return parts.map((_, i) => parts.slice(0, parts.length - i).join('.'))
}

function getEffectiveLevel(id: string): Level {
  for (const ancestor of ancestorIds(id)) {
    const configured = lookupConfigured(ancestor) // live logger or cache
    if (configured !== 'notset') return configured
  }
  return factoryDefaultLevel
}
```

`lookupConfigured`:

1. If registry has live logger → its configured field  
2. Else **in-memory `_configCache`** for that id  
3. Else `'notset'`

**MUST NOT** read the Store on this path.

Walk is O(dot depth) × `Map.get`. Call from `shouldLog` (hot path, cheap).

### 4.1 Hot path vs Store (locked)

| Event | What runs |
|---|---|
| Boot | `store.list()` → fill `_configCache` |
| `update` / `unset` | patch cache + live instance **now**; persist Store async |
| `subscribe` | patch **that id** in cache (+ live instance) |
| `log.debug()` | ancestor walk on cache/live only |

Stale until subscribe/bootstrap is the accepted cost of a cache. Do not “fix” it with `store.get` per line. Do not Redis/localStorage prefix-search for inheritance.

Memoizing the **result** of the walk is a later, API-stable follow-up: [`memoize-effective-level.md`](./memoize-effective-level.md).

Factory-without-registry: same walk using only in-memory parent chain **or** id prefixes among loggers the factory created. Simplest: attach `factory.defaultLevel` and, if no registry, still parse id prefixes against a factory-owned `Map<id, Logger>` **or** walk live `parent` refs. **Recommendation:** factory always keeps a weak/id map when used; registry is the same map when present. Avoid two sources of truth — **registry map is canonical when present**; without registry, `child()` can store `_parent: Logger` and walk pointers (configured notset → `parent.getEffectiveLevel()`). Pointer walk is enough for no-registry tests; dotted walk is required once ids exist in the registry (parents may be missing).

**Locked implementation split:**

- **With registry:** dotted id walk + cache (R6).  
- **Without registry:** parent pointer set in `child()`; walk pointers; top-of-chain uses constructor/`opts.level` or factory default.

---

## 5. Register / persist (must change)

Today `register()` does `store.set({ id, level: logger.level })` for every new id. That would persist `warn` on every `child()` and **break inherit**.

New rule:

- Register always puts the instance in the map.  
- If cache has explicit level → `setLevel` on the instance.  
- Else leave notset; **do not** `store.set`.  
- `update(id, level)` is what writes the store.  
- `unset(id)`: configured notset; delete from cache; remove from store list.

List APIs: union of **registered ids** (may be notset) and **store rows** (explicit). Return `{ id, configured, effective }` for UIs.

---

## 6. Runtime flip (ops-api narrative)

```ts
// boot
const registry = new Registry()
await registry.bootstrap(new InMemoryStore())
const factory = createLoggerFactory({
  transports: [createConsoleTransport()],
  formatter: devFormatter,
  level: 'info', // factory default / LOG_LEVEL — process fallback
  registry,
})
const root = factory.createLogger('ops-api')
root.setLevel('info') // explicit root so HTTP sibling inherit is defined
// or factory.createLogger('ops-api', { level: 'info' })

// route — no debug in source
const runoutLog = factory.createLogger('ops-api.runout')
await estimateRunout(client, input, runoutLog)
// estimateRunout: const log = logger.child('estimateRunout')  // NOTSET

// later, debug endpoint / REPL
registry.update('ops-api.runout', 'debug')
// next shouldLog on …estimateRunout walks to runout → debug

registry.unset('ops-api.runout')
// descendants NOTSET → walk to ops-api → info
```

Sibling `ops-api.http`: `createLogger('ops-api.http')`, NOTSET → follows `ops-api`, not `runout`. **Naming is the isolation mechanism.**

---

## 7. Breaking / migration

| Old | New |
|---|---|
| `child()` copies parent minLevel | `child()` NOTSET |
| `{ level: 'debug' }` in feature code | delete; set ancestor in store/UI |
| Cascade to “refresh children” | not needed for NOTSET descendants |
| Every register writes store | only explicit update/unset |

Call sites that passed `{ level: 'info' }` on every child to “be quiet” can drop it if the ancestor is already info/warn.

Eos `useLogger(name, { level: 'info' })` may still pass an explicit default — that **pins** the component and **blocks** inherit. Migration: defaults omitted → NOTSET; store/localStorage remains the one place to pin.

---

## 8. Tests (kit)

Minimum:

1. `child()` configured notset; parent `setLevel('debug')`; child `debug` emits; parent `setLevel('warn')`; child debug does not.  
2. Explicit child `debug`; parent `warn`; child still emits debug; grandchild NOTSET still emits.  
3. `update` does not change descendant **configured** levels.  
4. Unset parent → child NOTSET uses factory/ancestor.  
5. Walk with missing intermediate logger (`a.c` when `a.b` never created): `a.c` still inherits `a` if `a` is explicit.  
6. Register child does not add a store row.  
7. `Global.level` still suppresses below the floor.  
8. Mock Store: `debug()` / `getEffectiveLevel()` do not call `get` or `list`.

---

## 9. Out of this design

- Ops-api `GET/PUT /v0/loggers` (thin wrap of list/update/unset)  
- `*` / cascade helper  
- Redis Store  
- `OFF`  
- Handler `propagate` (Python’s second knob). ts-logkit already shares transports on `child()`; leave that as-is unless a later epic splits handlers per logger.  
- **Memoize effective level** — [`memoize-effective-level.md`](./memoize-effective-level.md)
