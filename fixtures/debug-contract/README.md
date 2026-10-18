# DEBUG HTTP contract fixtures

Mount-relative golden cases for TypeScript ↔ Python parity. Paths are **full listener paths** (origin omitted). Timestamps in tail lines are illustrative; tests must not assert live `ts` values.

| File | Scenario |
|------|----------|
| `health-200.json` | GET health under mount |
| `healthz-alias-200.json` | GET healthz |
| `not-found-404.json` | Unknown route |
| `not-found-outside-mount-404.json` | Path outside configured mount |
| `not-found-prefix-lookalike-404.json` | Segment boundary rejection |
| `tail-default-200.json` | GET tail with default `n` |
| `tail-query-200.json` | GET tail with `n` and `q` |
| `loggers-list-200.json` | GET loggers sorted array |
| `logger-get-notset-200.json` | GET unknown id |
| `logger-put-debug-200.json` | PUT valid level |
| `logger-put-invalid-level-400.json` | PUT bad level |
| `logger-put-invalid-json-400.json` | PUT non-JSON body |
| `logger-delete-unset-200.json` | DELETE returns inherited state |
| `mount-api-loggers-list-path.json` | Mount `/api/loggers` → list at `/api/loggers/loggers` |

Contract reference: [`docs/debug-http-contract.md`](../../docs/debug-http-contract.md).
