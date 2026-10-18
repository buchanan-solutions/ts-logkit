# Logkit monorepo plan

Single source of truth for Buchanan Solutions logging across **TypeScript** and **Python**: Python-style dotted logger names, runtime level pins, console + in-process ring + optional OTEL in parallel, and a private **DEBUG_PORT** HTTP surface for agents and operators.

## Public packages

### npm (`@buchanan-solutions/*`)

| Package | Role |
| -------- | ------ |
| **`logkit`** | Core factory, transports, registry, stores. Subpath **`/ring`**: buffer, tail, DEBUG HTTP dispatch, node debug listener helpers. Subpath **`/client`**: HTTP control client for tail/loggers. Optional **`log` CLI** (commander) lives in this package. |
| **`logkit-otel`** | OTLP log transport + Next tracing helpers. |
| **`logkit-redis`** | Redis-backed `Store` for shared logger-level pins (in-memory fallback). |
| **`logkit-fastify`** | Fastify debug server, log routes, `createServiceLogger` bundle. |
| **`logkit-next`** | Next.js server registration + client ingest transport. |
| **`logkit-mcp`** | Stdio MCP → `LOG_DEBUG_URL` (health, loggers, tail). |

Ring is **not** a separate npm package; use `@buchanan-solutions/logkit/ring`.

### PyPI

| Package | Role |
| -------- | ------ |
| **`buchanan-solutions-logkit`** | Stdlib phased config (migrated from pytools.logging), future `ring` / `debug` / `fastapi`. |
| **`buchanan-solutions-logkit-mcp`** | Future `uvx` stdio MCP (stub README only in this scaffold). |

## Spirit

- **Composable hierarchy** — one root per boundary, `.child("step")`, `NOTSET` inheritance until pinned.
- **Three sinks in servers** — stdout (containers), ring (HTTP tail), OTEL when configured.
- **Agents** — MCP and scripts talk to the debug listener, not product ports.
- **Contract-first** — `docs/debug-http-contract.md` and `fixtures/debug-contract/` (golden JSON) align TS and Python.

## This scaffold

- Like-for-like port from Core ts-mono `@core-mfg/log*`, with **`/log`** path prefix unchanged (see `TODOS.md`).
- No `@buchanan-solutions/ts-logkit` npm shim; consumers migrate to `@buchanan-solutions/logkit`.
- Core MFG host glue (session, monorepo env, route errors) stays in **ts-mono**, not here.
- Node workspace stabilization adds builds, existing tests, CLI packaging and per-package tagged GitHub Packages releases; Python remains deferred.

## Documentation

- [`docs/MCP.md`](docs/MCP.md) — log debug MCP (`logkit-mcp`), env vars, host examples
- [`docs/migration.md`](docs/migration.md) — npm/PyPI migration and mount URLs
- [`docs/debug-http-contract.md`](docs/debug-http-contract.md) — HTTP API SSOT

## Repo layout

- `packages/*` — pnpm workspace, compiled libraries.
- `python/*` — uv workspace members.
- Root — Biome, Changesets, shared docs/fixtures.
