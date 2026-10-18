# logkit

Buchanan Solutions logging packages: core logging, an in-process ring and debug HTTP API, plus OTEL, Redis, Fastify, Next.js and MCP adapters.

## Node development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```bash
pnpm install
pnpm check
```

`check` runs Biome, builds packages in dependency order, and runs the existing Vitest suites. Core tests include both `tests/` and `src/`. Python is outside this check.

The core package builds ESM, CommonJS, declarations and the `log` executable. MCP builds the `logkit-mcp` executable. Debug endpoints are relative to the host mount; `/ring` is browser-safe and `/ring/node` exposes the Node listener.

## Versioning and public npm

All six `@buchanan-solutions/logkit*` packages target `https://registry.npmjs.org` with public access. Consumers do not need a GitHub PAT. Remove any old scope mapping to GitHub Packages from consumer configuration.

Changesets runs locally from the repository root:

```bash
pnpm changeset
pnpm run version
pnpm install --lockfile-only
pnpm check
```

Review and commit versions, dependency updates, changelogs and the lockfile. Packages have independent versions. The prepared initial npm release is core `0.6.0` and the five adapters/MCP packages `0.2.1`.

See [the release runbook](docs/npm-publishing.md) for the first manual release and subsequent GitHub Actions Trusted Publishing setup. A safe artifact dry run after building is:

```bash
RELEASE_TAG=logkit@0.6.0 node scripts/release.mjs --dry-run
```

CI checks pull requests and main pushes. Only matching package tags publish, after checks and verification that the commit belongs to `main`. Each tag selects one package, e.g. `logkit@0.6.0` or `logkit-mcp@0.2.1`. The release script packs with pnpm, then uploads the tarball with npm. Existing versions are skipped; other registry errors stop the release.

Configure an npm trusted publisher for each package before using CI. The release job uses OIDC, not `GITHUB_TOKEN` or a stored npm token. Publish core first, then OTEL/Redis, then Fastify/Next/MCP; wait for dependencies before pushing dependent tags. Do not push tags before the corresponding release is intended.

## MCP and shell CLI

- **MCP (agents):** [`docs/MCP.md`](docs/MCP.md) — stdio `logkit-mcp`, `LOG_DEBUG_URL`, host examples (Cursor / Claude / Codex). This repo does not install MCP config into your editor.
- **Shell:** `log` from `@buchanan-solutions/logkit` — `node packages/logkit/dist/log.cjs --help` after build.

See also [migration](docs/migration.md), [debug HTTP contract](docs/debug-http-contract.md), [PLAN.md](PLAN.md), [TODOS.md](TODOS.md).
