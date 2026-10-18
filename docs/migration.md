# Node migration

Existing logging behavior, `/log/*` routes and environment variable names are retained. Package names and entry points change; no legacy package shim is provided.

- Legacy standalone logging core → `@buchanan-solutions/logkit`.
- Ring buffer, dispatch, tail and Node debug listener → `@buchanan-solutions/logkit/ring`.
- Debug HTTP control client → `@buchanan-solutions/logkit/client`.
- OTEL transport and Next tracing helpers → `@buchanan-solutions/logkit-otel` and its `/next` entry point.
- Redis store → `@buchanan-solutions/logkit-redis`.
- Fastify routes, debug listener and service logger → `@buchanan-solutions/logkit-fastify`.
- Next server handlers and browser transport → `@buchanan-solutions/logkit-next` and its `/client` entry point.
- MCP stdio executable → `@buchanan-solutions/logkit-mcp` (`logkit-mcp`). Keep `LOG_DEBUG_URL` and optional `LOG_MCP_LABEL`.
- Shell CLI → `log`, supplied by `@buchanan-solutions/logkit`.

Registry, stores, server stores, and testing helpers remain available through core's `/registry`, `/stores`, `/stores/server`, `/testing`, and `/testing/vitest` entry points.

Application-specific sessions, environment setup and MCP host installation remain in the consumer. Python and configurable debug mounts are deferred.
