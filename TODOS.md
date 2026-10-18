# Logkit monorepo TODOs

## Configurable debug mount path (major)

**Status:** Not implemented — current code is a like-for-like port with a hardcoded `/log` segment.

**Requirement:** Callers choose **where** debug routes are mounted (e.g. `DEBUG_PORT` root, `/api/debug`, `/private/telemetry`). Endpoints are **relative to that mount**, not nested under a mandatory `/log` prefix.

**Today (legacy):**

- Fastify: `prefix: "/log"` → `/log/tail`, `/log/loggers`, …
- Dispatch: paths like `/log/tail`, `/log/loggers/:id`
- Control client: `{base}/log/tail`, `{base}/log/loggers`
- MCP tools: descriptions reference `/log/...` on `LOG_DEBUG_URL`
- Next handlers: slug routes assume `/log` layout

**Target behavior:**

- API: `createLogRoutes({ mount: "/api/debug" })` or equivalent → `/api/debug/tail`, `/api/debug/loggers`, …
- `LOG_DEBUG_URL` remains the **origin + mount** (e.g. `http://127.0.0.1:6060/api/debug`), not always `…/log`.
- MCP + CLI resolve paths from mount config or discovery, not baked-in `/log`.
- Python `logkit.debug` / FastAPI helper mirrors the same contract.
- Update `docs/debug-http-contract.md` and golden fixtures when implemented.

**Implement after:** packages compile, tests run, and ts-mono / ai-server consumers have a migration note.

---

## Follow-ups (smaller)

- Wire `log` CLI bin build (esbuild bundle) in `@buchanan-solutions/logkit`.
- Port ring + dispatch to Python (`logkit.ring`, `logkit.debug`).
- Implement `buchanan-solutions-logkit-mcp` (uvx parity with `@buchanan-solutions/logkit-mcp`).
- Contract tests: vitest + pytest against `fixtures/debug-contract/`.
- Changesets publish workflow for all npm packages + PyPI members.
- Migrate ts-mono from `@core-mfg/log*` workspace packages to published `@buchanan-solutions/logkit*`.
- Rename GitHub repo to `logkit` when ready (checkout folder name can stay `ts-logkit` locally).
