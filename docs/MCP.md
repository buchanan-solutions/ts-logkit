# Log debug MCP

`@buchanan-solutions/logkit-mcp` is a **stdio** [Model Context Protocol](https://modelcontextprotocol.io/) server. It does not embed your application. It speaks JSON-RPC on stdin/stdout and forwards tool calls to the **log debug HTTP API** your process already exposes (ring tail, runtime logger levels).

This repository **does not** install or merge MCP entries into Cursor, Claude Code, Codex, or other hosts. Your application repo (or a shared install script there) adds host config and points at the published **`logkit-mcp`** executable.

## Prerequisites

1. The target service is running with logkit debug HTTP enabled (Fastify `startDebugHttpServer`, Node `ensureDebugHttpServer`, Next `registerNextServerLogging`, etc.).
2. You can reach that listener from the machine where the MCP process runs (host port mapping in Docker, `127.0.0.1` locally, etc.).
3. **`LOG_DEBUG_URL`** is set to the **full mount URL** (origin + path prefix). See [debug HTTP contract](debug-http-contract.md) and [migration](migration.md).

## Environment variables

| Variable | Required | Role |
| -------- | -------- | ---- |
| **`LOG_DEBUG_URL`** | Yes | Complete debug mount, e.g. `http://127.0.0.1:6060` or `http://127.0.0.1:6060/api/logging`. Tools call `{LOG_DEBUG_URL}/health`, `/tail`, `/loggers`, … |
| **`LOG_MCP_LABEL`** | No | Short label in MCP server instructions (stderr / UI), e.g. `api` or `ai-server`. |

No default port is inferred. If `LOG_DEBUG_URL` is missing, the process exits on startup.

## Tools

| Tool | Kind | HTTP (relative to mount) |
| ---- | ---- | ------------------------- |
| `debug_health` | read | `GET /health` |
| `debug_loggers_list` | read | `GET /loggers` |
| `debug_loggers_get` | read | `GET /loggers/:id` |
| `debug_loggers_set_level` | write | `PUT /loggers/:id` body `{"level":"debug"}` |
| `debug_loggers_unset_level` | write | `DELETE /loggers/:id` |
| `debug_log_get_tail` | read | `GET /tail?n=&q=` |

Suggested workflow for agents: **health → list loggers → set level on a prefix → reproduce → tail → unset**.

Levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

## Running the executable

After installing from GitHub Packages (see root [README](../README.md#versioning-and-github-packages)):

```bash
LOG_DEBUG_URL=http://127.0.0.1:6060 LOG_MCP_LABEL=my-api logkit-mcp
```

The package bin is **`logkit-mcp`** → `mcp/dist/stdio.mjs`. Node.js **20+** (24 recommended) must be on `PATH`.

**From a built clone of this repo:**

```bash
pnpm install
pnpm --filter @buchanan-solutions/logkit-mcp build
LOG_DEBUG_URL=http://127.0.0.1:6060 pnpm --filter @buchanan-solutions/logkit-mcp start:mcp
```

**Direct Node (same artifact):**

```bash
LOG_DEBUG_URL=http://127.0.0.1:6060 node /path/to/node_modules/@buchanan-solutions/logkit-mcp/mcp/dist/stdio.mjs
```

Use whichever launch style your MCP host supports (`command` + `args`, or a wrapper script). The MCP SDK is **not** bundled; install dependencies so `node_modules` resolves `@modelcontextprotocol/sdk` next to the published package (normal `pnpm add` / `npm install`).

## Host configuration (examples)

Replace paths and URLs. Register **one MCP server entry per target service**; reuse the same `logkit-mcp` command with different env.

### Cursor (`mcp.json`)

```json
{
  "mcpServers": {
    "my-service-log-debug": {
      "command": "logkit-mcp",
      "env": {
        "LOG_DEBUG_URL": "http://127.0.0.1:6060",
        "LOG_MCP_LABEL": "my-service"
      }
    }
  }
}
```

If `logkit-mcp` is not on `PATH`, use `"command": "node"` and put the absolute path to `mcp/dist/stdio.mjs` in `"args"`.

### Claude Code / similar JSON config

Same shape: stdio server, `command`/`args`, `env` with `LOG_DEBUG_URL` (and optional `LOG_MCP_LABEL`).

### Codex (`config.toml` fragment)

Use your host’s documented MCP table format; values are the same: run Node on `stdio.mjs` (or `logkit-mcp` bin) with `LOG_DEBUG_URL` in the process environment.

### Multiple services

```json
{
  "mcpServers": {
    "ops-log-debug": {
      "command": "logkit-mcp",
      "env": {
        "LOG_DEBUG_URL": "http://127.0.0.1:6060",
        "LOG_MCP_LABEL": "ops"
      }
    },
    "next-log-debug": {
      "command": "logkit-mcp",
      "env": {
        "LOG_DEBUG_URL": "http://127.0.0.1:6062",
        "LOG_MCP_LABEL": "next"
      }
    }
  }
}
```

## Shell CLI (non-MCP)

For scripts and terminals, `@buchanan-solutions/logkit` publishes the **`log`** CLI (tail, loggers) against the same HTTP contract. It uses **`LOG_URL`** or `--port` / URL flags (see `log --help`). MCP uses **`LOG_DEBUG_URL`** only.

## Python

Stdio MCP for Python (`uvx buchanan-solutions-logkit-mcp`) is planned; see [python/logkit-mcp/README.md](../python/logkit-mcp/README.md).

## Related docs

- [Debug HTTP contract](debug-http-contract.md) — paths, JSON shapes, tail semantics
- [Migration](migration.md) — package names and mount URL changes
- [PLAN.md](../PLAN.md) — monorepo package map
