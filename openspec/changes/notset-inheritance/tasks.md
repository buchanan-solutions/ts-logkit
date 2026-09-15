# notset-inheritance — Tasks (kit 0.4 build-out)

**Specs:** [`requirements.md`](./requirements.md) · [`design.md`](./design.md)  
**Ship/fan-out checklist:** [`openspec/changes/ts-logkit-fanout.md`](../../../../../../openspec/changes/ts-logkit-fanout.md)  
**Later:** [`../memoize-effective-level.md`](../memoize-effective-level.md) · [`../multi-transport-format-peers.md`](../multi-transport-format-peers.md)

**Version:** `@buchanan-solutions/ts-logkit@0.4.0` (breaking inherit semantics; additive APIs). No `/v2` subpath.

---

## Locked decisions (do not re-litigate)

| Topic | Decision |
|---|---|
| Inheritance | NOTSET + ancestor walk. Not copy-at-create. Not cascade `setLevel`. |
| `.level` | **Effective** severity (`Level`) — safe for current `useLogger` / modal readers |
| `configuredLevel` | `Level \| 'notset'` — pin vs inherit |
| `child()` | Keep. Default configured NOTSET; `opts.level` still pins |
| `getLogger` | Additive on factory (= `createLogger`); Python-shaped name |
| Default factory | `setDefaultFactory(factory)` + top-level `getLogger(id)` after boot |
| Factory role | Still where consumer wires transports, formatter, level, registry |
| Hot path | Sync cache/live only; **never** Store on `shouldLog` |
| Persist | Store = explicit severities only; no `store.set` on register for NOTSET |
| HTTP / eos hook | Out of kit; ops-api + fan-out docs |
| Multi format×transport peers | Out of 0.4 — see `multi-transport-format-peers.md` |

---

## 0. Hygiene

- [x] Remove `TS_LOGKIT_LOCAL` / probe `console.log`s from `Logger`
- [x] Confirm TS 6 + tsup `dts` (`ignoreDeprecations: "6.0"`, `types: ["node"]`) still green

## 1. Level model

- [x] Configured type: `Level \| 'notset'` (keep `LEVELS` = severities only; no `OFF`)
- [x] Logger: store configured separately; `configuredLevel` getter
- [x] `getEffectiveLevel()`: dotted id walk (registry) or parent pointer (no registry) → factory default
- [x] `.level` getter returns **effective** (compat)
- [x] `shouldLog` / `emit` filter on effective + `Global.level`
- [x] `setLevel(level)` → explicit pin; `clearLevel()` → NOTSET

## 2. `child()` + factory create

- [x] `child(id)` → `parentId.childId`, share transports/formatter/hooks, configured **NOTSET** unless `opts.level`
- [x] Stop copying `parent._minLevel` into child
- [x] `createLogger` / register: hydrate explicit from cache only; else NOTSET (or explicit runtimeDefaults)
- [x] **Do not** `store.set` on register when NOTSET

## 3. Registry + Store

- [x] `update(id, level)` exact id only (cache + live + store)
- [x] `unset(id)` → NOTSET, drop cache entry, remove store row
- [x] Subscribe patches **named** id only; descendants via walk
- [x] List/inspect: registered ∪ store; expose configured + effective

## 4. Python-feel API (additive)

- [x] `LoggerFactory.getLogger(id, opts?)` alias of `createLogger`
- [x] `setDefaultFactory(factory)` / clear or replace semantics documented
- [x] Top-level `getLogger(id)` uses default factory; clear error if unset
- [x] Export from package root; README snippet: boot factory → `setDefaultFactory` → `getLogger('a.b')`
- [x] Keep `child()` — not legacy; use when parent is in hand

## 5. Tests

- [x] Parent `setLevel('debug')` → NOTSET child emits debug; parent warn → child quiet
- [x] Explicit child debug survives parent warn; grandchild NOTSET follows child
- [x] Missing intermediate id (`a.c` with only `a` explicit) inherits `a`
- [x] Register child does not add store row
- [x] Emit / `getEffectiveLevel` does not call Store `get`/`list`
- [x] `getLogger` === `createLogger` singleton; default factory path works
- [x] `update` / `unset` live flip without recreate

## 6. Docs + version

- [x] CHANGELOG 0.4.0: breaking `child()` inherit; `.level` = effective; additive APIs
- [x] README: NOTSET, `getLogger`, `setDefaultFactory`, configured vs effective
  - [x] This is a public repo so ensure the readme is production grade and  junior-friendly so adoption is high
- [x] Bump `package.json` to `0.4.0`
- [x] `pnpm build` + `pnpm test` green

## 7. Ops-api consume (same PR stream / next; not kit HTTP)

Tracked in fan-out doc §2 — kit must enable:

- [x] Ops-api: registry + InMemoryStore + `setDefaultFactory` + explicit `ops-api` from `LOG_LEVEL`
- [x] Ops-api: `GET/PUT /v0/loggers` (+ unset); curl flip `ops-api` while hitting `/version`

---

## Explicitly not in these tasks

- Memoize effective level  
- Multi formatter↔transport peer groups  
- Eos `useLogger` persist fix (fan-out §6a)  
- Redis Store, cascade/`*`, kit REST  
