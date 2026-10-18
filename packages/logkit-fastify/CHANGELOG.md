# @buchanan-solutions/logkit-fastify

## 0.2.1

### Patch Changes

- 8f09062: Debug HTTP routing and control clients now treat `LOG_DEBUG_URL` / `LOG_URL` as the **complete mount URL** (origin + path prefix). Endpoint suffixes are `/health`, `/tail`, `/loggers`, and `/loggers/:id` — there is no mandatory `/log` segment. Hosts may still choose mount `/log` explicitly. Update MCP and CLI configuration when upgrading from the legacy `{origin}/log/*` addressing.
- Updated dependencies [641cd43]
- Updated dependencies [8f09062]
  - @buchanan-solutions/logkit@0.6.0
  - @buchanan-solutions/logkit-otel@0.2.1
  - @buchanan-solutions/logkit-redis@0.2.1
