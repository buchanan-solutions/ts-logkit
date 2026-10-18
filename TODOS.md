# Logkit monorepo TODOs

## Configurable debug mount path (major)

**Status:** Scheduled for the next AI Server / LogKit slice; not implemented. Current code still hardcodes `/log` in several paths.

**Work package:** deploy checkout `openspec/changes/ai-server-and-logkit/overview.md` and `tasks.md` (from this checkout: `../../openspec/changes/ai-server-and-logkit/`). TypeScript routing/client/MCP changes precede the Python contract handoff.

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
- MCP + CLI treat the supplied base URL as the complete mount and append only endpoint suffixes; no discovery or implicit `/log`.
- Health shares that mount: `{base}/health`; controls are `{base}/tail`, `{base}/loggers`, and `{base}/loggers/:id` (GET/PUT/DELETE for an id; no POST level update).
- Python `logkit.debug` / FastAPI helper mirrors the same contract.
- Update `docs/debug-http-contract.md` and golden fixtures when implemented.

**Implement in:** phase 0 of the linked work package, now that Node builds/tests are green. Update the contract, fixtures, adapters and migration notes together, then implement Python against that mount-relative contract. Do not mark this complete until the code and checks pass.

---

## Follow-ups (smaller)

- [x] Wire `log` CLI bin build (esbuild bundle) in `@buchanan-solutions/logkit`.
- Port ring + dispatch to Python (`logkit.ring`, `logkit.debug`).
- Implement `buchanan-solutions-logkit-mcp` (uvx parity with `@buchanan-solutions/logkit-mcp`).
- Contract tests: vitest + pytest against `fixtures/debug-contract/`.
- [x] Local Changesets versioning and per-package tagged GitHub Packages releases.
- PyPI release workflow (deferred).
- Migrate ts-mono from `@core-mfg/log*` workspace packages to published `@buchanan-solutions/logkit*`.
- Rename GitHub repo to `logkit` when ready (checkout folder name can stay `ts-logkit` locally).
