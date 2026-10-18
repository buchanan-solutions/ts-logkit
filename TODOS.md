# Logkit monorepo TODOs

## Configurable debug mount path (major)

**Status:** Implemented in phase 0 of deploy `openspec/changes/logkit-and-ai-server` (2026-10-18). TypeScript mount-relative routing, client/MCP/CLI updates, contract docs, and fixtures are frozen for the Python worker.

**Work package:** `../../openspec/changes/logkit-and-ai-server/overview.md` and `tasks.md`.

**Behavior:**

- API: caller-selected mount (default `/`) → `{mount}/health`, `{mount}/tail`, `{mount}/loggers`, …
- `LOG_DEBUG_URL` / `LOG_URL`: complete origin + mount; clients append suffixes only.
- Contract: [`docs/debug-http-contract.md`](docs/debug-http-contract.md), fixtures: [`fixtures/debug-contract/`](fixtures/debug-contract/README.md).

---

## Follow-ups (smaller)

- [x] Wire `log` CLI bin build (esbuild bundle) in `@buchanan-solutions/logkit`.
- [x] Configurable debug mount path (this slice — TS done; Python in phases 1–2).
- Port ring + dispatch to Python (`logkit.ring`, `logkit.debug`) — **Python worker phases 1–2**.
- Implement `buchanan-solutions-logkit-mcp` (uvx parity with `@buchanan-solutions/logkit-mcp`).
- Contract tests: vitest + pytest against `fixtures/debug-contract/`.
- [x] Local Changesets versioning and per-package tagged GitHub Packages releases.
- PyPI release workflow (deferred).
- Migrate ts-mono from `@core-mfg/log*` workspace packages to published `@buchanan-solutions/logkit*`.
- Rename GitHub repo to `logkit` when ready (checkout folder name can stay `ts-logkit` locally).
