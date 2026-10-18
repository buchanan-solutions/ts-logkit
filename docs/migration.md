# Node migration

Package names and entry points changed from legacy `@core-mfg/log*`; no legacy package shim is provided.

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

## Debug base URL change (mount-relative)

**Before (legacy):** `LOG_DEBUG_URL=http://127.0.0.1:6060` implied control routes under **`/log/*`** (`/log/tail`, `/log/loggers`, …). Health was often at **`/health`** on the listener root.

**After:** `LOG_DEBUG_URL` is the **complete mount URL**. Examples:

| Mount intent | `LOG_DEBUG_URL` | List loggers |
|--------------|-----------------|--------------|
| Listener root | `http://127.0.0.1:6060` | `GET /loggers` |
| AI Server (planned) | `http://127.0.0.1:6060/api/logging` | `GET /api/logging/loggers` |
| Alternate | `http://127.0.0.1:6060/api/t-log` | `GET /api/t-log/tail` |
| Legacy grouping | `http://127.0.0.1:6060/log` | `GET /log/tail` |

Health for MCP tools is **`{LOG_DEBUG_URL}/health`** (same mount as tail/loggers). There is no automatic alias from the old origin-only URL to `/log/*`.

Fastify `startDebugHttpServer({ debugMount })` and Node `ensureDebugHttpServer({ mount })` default to `/`. Service-level `/health` on Fastify (name/status) is unchanged and separate from contract health under the debug mount.

Application-specific sessions, environment setup and MCP host installation remain in the consumer. MCP setup: [`MCP.md`](MCP.md). Python parity: [`python-integration-api.md`](python-integration-api.md).
