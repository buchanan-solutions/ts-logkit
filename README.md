# logkit

Buchanan Solutions logging packages: core logging, an in-process ring and debug HTTP API, plus OTEL, Redis, Fastify, Next.js and MCP adapters.

## Node development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```bash
pnpm install
pnpm check
```

`check` runs Biome, builds packages in dependency order, and runs the existing Vitest suites. Core tests include both `tests/` and `src/`. Fastify currently has no test suite. Python is outside this check.

The core package builds ESM, CommonJS, declarations and the `log` executable. MCP builds the `logkit-mcp` executable. Existing `/log/*` routes and environment variables are preserved.

## Versioning and GitHub Packages

Changesets runs locally from the repository root:

```bash
pnpm changeset
pnpm run version
```

Review and commit the generated versions, dependency updates, changelogs and lockfile, then merge to `main`. CI checks PRs and pushes to `main`; it publishes only on package tags whose versions match the committed manifests:

```bash
git tag logkit@0.5.0
git push origin logkit@0.5.0
```

Use the actual new package version. Adapters use tags such as `logkit-redis@0.2.0`. Each tag publishes only that package to **https://npm.pkg.github.com**, using `GITHUB_TOKEN` with `packages: write`. The tagged commit must be on `main`, and the full Node check must pass. Already-published versions are skipped; registry authentication and other lookup failures fail the release.

When releasing dependent packages, publish dependencies first and wait for their workflows to finish: core → OTEL/Redis → Fastify/Next; MCP needs core. `pnpm publish` converts `workspace:*` dependencies to the committed versions. Changesets publishing automation is not required.

Consumers authenticate to GitHub Packages with package read access and configure:

```ini
@buchanan-solutions:registry=https://npm.pkg.github.com
```

## MCP

Install `@buchanan-solutions/logkit-mcp` from GitHub Packages, then configure your MCP host to run `logkit-mcp` with `LOG_DEBUG_URL` set to the debug listener origin (for example `http://127.0.0.1:6060`). `LOG_MCP_LABEL` is optional. From a built checkout:

```bash
LOG_DEBUG_URL=http://127.0.0.1:6060 pnpm --filter @buchanan-solutions/logkit-mcp start:mcp
node packages/logkit/dist/log.cjs --help
```

Host configuration stays in the consuming application. See [migration notes](docs/migration.md), [package plan](PLAN.md), [debug HTTP contract](docs/debug-http-contract.md), and [future work](TODOS.md).
