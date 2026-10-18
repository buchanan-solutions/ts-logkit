---
"@buchanan-solutions/logkit": minor
"@buchanan-solutions/logkit-mcp": patch
"@buchanan-solutions/logkit-fastify": patch
"@buchanan-solutions/logkit-next": patch
---

Debug HTTP routing and control clients now treat `LOG_DEBUG_URL` / `LOG_URL` as the **complete mount URL** (origin + path prefix). Endpoint suffixes are `/health`, `/tail`, `/loggers`, and `/loggers/:id` — there is no mandatory `/log` segment. Hosts may still choose mount `/log` explicitly. Update MCP and CLI configuration when upgrading from the legacy `{origin}/log/*` addressing.
