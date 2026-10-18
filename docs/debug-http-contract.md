# DEBUG HTTP contract (mount-relative)

Frozen in deploy work package `openspec/changes/ai-server-and-logkit` phase 0. TypeScript in `@buchanan-solutions/logkit/ring` is the reference implementation; Python `logkit.debug` must match these semantics.

## Base URL semantics

- **`LOG_DEBUG_URL`** (MCP) and **`LOG_URL`** (CLI) are the **complete origin + mount**, e.g. `http://127.0.0.1:6060/api/logging`.
- Clients append **only** endpoint suffixes: `/health`, `/healthz`, `/tail`, `/loggers`, `/loggers/:id`.
- There is **no** mandatory `/log` grouping segment. Hosts may choose mount `/log` explicitly if they want the old path shape (`/log/tail`, …).
- Trailing slashes on the base URL are normalized away. Nested path segments on the base are preserved.
- Route matching uses **segment boundaries**: `/api/logging-other/tail` is **not** under mount `/api/logging`.

## Endpoints (all relative to the configured mount)

| Method | Path | Success |
|--------|------|---------|
| GET | `{mount}/health`, `{mount}/healthz` | 200 `{"status":"ok"}` |
| GET | `{mount}/tail?n=&q=` | 200 tail object (below) |
| GET | `{mount}/loggers` | 200 sorted array of logger objects |
| GET | `{mount}/loggers/:id` | 200 single logger object |
| PUT | `{mount}/loggers/:id` | 200 single logger object |
| DELETE | `{mount}/loggers/:id` | 200 single logger object |

Unsupported methods/paths: **404** `{"error":"not found"}`.

There is no `loggers/list`, generic `POST log`, or POST level update.

## Logger object

```json
{ "id": "server", "configured": "notset", "effective": "info" }
```

- **`configured`**: pinned level or the string **`notset`** (never `null`).
- **`effective`**: inherited/filter level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).
- Root logger id on the wire: **`root`**.
- PUT body: `{"level":"debug"}` — levels `trace`, `debug`, `info`, `warn`, `error`, `fatal` (case-normalized). Invalid body/level → **400** with TS-matching error strings (see fixtures).
- DELETE clears explicit configuration (NOTSET / inherit); does not restore a prior env-file pin.

## Tail

GET `{mount}/tail`:

- Query **`n`**: default **100**, max **500**; invalid/nonpositive values fall back to **100** (integer floor + clamp).
- Query **`q`**: optional case-insensitive substring filter over each line's JSON text.
- Response:

```json
{
  "n": 100,
  "capacity": 1000,
  "size": 42,
  "lines": [ /* oldest→newest within window */ ]
}
```

- **`size`**: current ring occupancy (not filtered length).
- Selection: take newest `n` lines, apply `q`, return chronological oldest→newest within that window.

Line shape:

```json
{
  "ts": 1700000000000,
  "logger_id": "app",
  "level": "info",
  "message": "hello",
  "args": [],
  "error": { "name": "Error", "message": "…", "stack": "…" }
}
```

`args` and `error` are optional. Python maps WARNING→`warn`, CRITICAL→`fatal`, NOTSET→`notset`; TRACE=5 locally without exposing `warning`/`critical` on the wire.

## Environment

| Variable | Role |
|----------|------|
| `DEBUG_PORT` | Private listener port (default `6060`) when host starts the listener |
| `LOG_DEBUG_URL` | MCP: complete mount URL |
| `LOG_URL` / `LOG_PORT` | CLI base resolution |
| `LOG_MCP_LABEL` | Optional MCP display label |

## Fixtures

Golden request/response pairs: [`fixtures/debug-contract/`](../fixtures/debug-contract/README.md).

## Python integration surface (frozen)

See [`docs/python-integration-api.md`](python-integration-api.md).
