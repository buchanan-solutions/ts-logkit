# buchanan-solutions-logkit-mcp (planned)

Stdio **Model Context Protocol** server — Python / **uvx** equivalent of [`@buchanan-solutions/logkit-mcp`](../../packages/logkit-mcp).

## Intended usage (not implemented)

```bash
export LOG_DEBUG_URL=http://127.0.0.1:6060   # debug listener origin (+ mount path when TODOS mount work lands)
export LOG_MCP_LABEL=ai-server                 # optional

uvx buchanan-solutions-logkit-mcp
```

## Tools (parity with Node MCP)

Same workflow as the TypeScript MCP in `packages/logkit-mcp`:

1. `debug_health`
2. `debug_loggers_list` / get / set / unset level
3. `debug_log_get_tail`

Target process must expose the logkit debug HTTP server (FastAPI, Fastify, Next debug port, etc.).

## Status

This directory is a **stub** in the initial monorepo scaffold. Implementation will use the official Python MCP SDK and `@buchanan-solutions/logkit` HTTP client once Python `ring`/`debug` land.
