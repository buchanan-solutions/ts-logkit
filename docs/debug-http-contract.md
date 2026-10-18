# DEBUG HTTP contract (draft)

Canonical behavior is implemented in TypeScript by `@buchanan-solutions/logkit/ring` (`handleDebugHttpPath`, Fastify/Next adapters).

**Current (legacy):** routes live under a **`/log`** prefix on the debug listener (see `TODOS.md` for mount-path flexibility).

**Env:**

- `DEBUG_PORT` — private listener (default `6060`)
- `LOG_DEBUG_URL` — origin used by MCP/CLI (includes mount path when applicable)
- `LOG_MCP_LABEL` — optional MCP display label

Golden JSON fixtures: `fixtures/debug-contract/` (to be populated).
