# buchanan-solutions-logkit

Python half of the [logkit](https://github.com/buchanan-solutions/logkit) monorepo.

- **`logkit.stdlib`** — phased stdlib logging (bootstrap, merge levels, export for Uvicorn workers).
- **`logkit.ring`**, **`logkit.debug`** — in-process ring capture and mount-relative debug HTTP (see repo `docs/debug-http-contract.md`).
- **`logkit.fastapi`** — stub for future host adapters.

Build (from this directory):

```bash
uv run hatch build
```

Publish uses `scripts/publish.sh` with `.env.test` (default) or `--live` + `.env`; see `.env.example`.
