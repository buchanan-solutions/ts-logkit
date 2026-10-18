# Publishing LogKit to public npm

Checked against the repository and npm documentation on 2026-10-18.

## Recommended approach

Publish the first release manually from your machine. This establishes the npm packages and lets you verify account permissions, package contents and public installation directly. Then move subsequent releases to the existing tag-driven GitHub Actions workflow, using npm Trusted Publishing (OIDC) rather than a stored npm publishing token.

Keep pnpm for installation, Changesets, checks, builds and packing. Use the npm CLI to upload the resulting tarballs. Publishing this way does not migrate the project away from pnpm.

The repository is prepared for public npm: registries, CI publishing and Changesets versions are applied. No upload or release tag has been made. Python/PyPI releases are separate. Sections 2–3 explain the preparation for future releases; the first upload uses the versions below.

## What is being published

Six scoped packages, each with its own version:

- `@buchanan-solutions/logkit`
- `@buchanan-solutions/logkit-otel`
- `@buchanan-solutions/logkit-redis`
- `@buchanan-solutions/logkit-fastify`
- `@buchanan-solutions/logkit-next`
- `@buchanan-solutions/logkit-mcp`

The repository root is private and is not published. Retain the existing scope; there is no need to acquire the unscoped `logkit` name. The prepared first npm release is core `1.0.0` and each other package `1.0.0`, aligned for the initial stable public release. Do not rerun versioning or invent additional bumps for this prepared release.

## 1. Set up your npm account and organization

1. [Create or sign into your npm account](https://www.npmjs.com/signup), verify your email and enable two-factor authentication. Save recovery information in your password manager.
2. Create or obtain publishing access to the npm organization `buchanan-solutions`. The GitHub organization does not automatically create or grant access to the corresponding npm organization. If that scope is already owned by someone else, resolve ownership before changing package names.
3. Public scoped packages can be published with `--access public`; consumers can download them without a GitHub PAT. See npm's [organization setup](https://docs.npmjs.com/creating-an-organization/) and [scoped public publishing guide](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).
4. Authenticate locally:

```bash
source "$HOME/.nvm/nvm.sh"
nvm use 24
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
```

Complete browser/2FA prompts. Keep credentials in your user configuration, never the repository. `whoami` confirms local login; package/org permissions still need to be correct.

## 2. Prepare the repository for npmjs (already applied)

Work in `/home/alex/git/core/deploy/.external/ts-logkit`. Before any release, review and commit these changes:

- Change `.npmrc`'s `@buchanan-solutions` registry mapping to `https://registry.npmjs.org`.
- Change all six package manifests' `publishConfig.registry` to that URL; keep `publishConfig.access` as `public`.
- Change the hardcoded registry in `scripts/release.mjs` and the registry settings in `.github/workflows/build.yaml`. The script and workflow now target npmjs; keep them aligned.
- Remove the release job's use of `secrets.GITHUB_TOKEN` as `NODE_AUTH_TOKEN` when using OIDC. That token cannot publish to npmjs. Keep unrelated GitHub permissions/authentication where needed.
- Check each package's name, license, repository URL, exports, types and included files. Keep repository URLs aligned with the actual GitHub repository; current manifests identify `buchanan-solutions/ts-logkit`.

Do not push release tags while the old workflow still targets GitHub Packages. A manual first release does not require CI publishing to be enabled, but disable or migrate the old release path before pushing its matching tags.

### Apply and inspect versions (already applied for this release)

```bash
cd /home/alex/git/core/deploy/.external/ts-logkit
source "$HOME/.nvm/nvm.sh"
nvm use 24
pnpm install --frozen-lockfile
pnpm exec changeset status
pnpm run version
pnpm install --lockfile-only
```

`pnpm run version` runs this repo's Changesets script. Inspect the changed manifests, changelogs, internal dependency ranges and lockfile. Do not force every package onto core's version. Before publishing each chosen version, query npmjs explicitly:

```bash
npm view @buchanan-solutions/logkit versions --json --registry=https://registry.npmjs.org
```

Repeat for the other packages. A genuine E404 can mean the package does not exist yet; authentication, connectivity and permission errors need investigation. An existing version cannot be overwritten. See [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

## 3. Build, check and pack the release

Run the existing suite against the final versioned source:

```bash
pnpm check
```

Create a fresh artifact directory and pack each package explicitly. The repository's pinned pnpm version does not support recursive or filtered packing; run `pack` from each package directory:

```bash
release_dir="$(mktemp -d /tmp/logkit-npm-release.XXXXXX)"
for package in logkit logkit-otel logkit-redis logkit-fastify logkit-next logkit-mcp; do
  (cd "packages/$package" && pnpm pack --pack-destination "$release_dir") || break
done
printf '%s\n' "$release_dir"
```

Stop if any package fails to pack; six successful tarballs are required for an initial release of all packages. `pnpm pack` rewrites `workspace:` dependencies to publishable versions. Do not publish raw workspace manifests with unresolved `workspace:*` dependencies. See [pnpm workspace publishing](https://pnpm.io/workspaces) and [pnpm pack](https://pnpm.io/cli/pack).

Inspect every archive, substituting its actual filename:

```bash
tar -tzf "$release_dir/ACTUAL_PACKAGE_FILENAME.tgz"
tar -xOf "$release_dir/ACTUAL_PACKAGE_FILENAME.tgz" package/package.json
npm publish "$release_dir/ACTUAL_PACKAGE_FILENAME.tgz" --dry-run --access public --registry=https://registry.npmjs.org
```

Confirm compiled exports and declarations exist, internal versions match the intended release, and only intended public files are included. For MCP, verify `mcp/dist/stdio.mjs` and the `logkit-mcp` bin mapping. Inspect license/readme inclusion and exclude local configuration or credentials. Test these exact tarballs in the local consumer before release if they differ from the artifacts already validated.

Commit the final release source/version/configuration changes and record the commit SHA. Keep generated tarballs out of Git. Publish artifacts produced from that reviewed state; rebuild and recheck if source changes.

## 4. Publish the first release locally

This is the actual public upload step. Use the reviewed tarballs, one at a time, with real filenames:

```bash
npm publish "$release_dir/ACTUAL_PACKAGE_FILENAME.tgz" --access public --registry=https://registry.npmjs.org
```

Publish core first, then OTEL/Redis, then Fastify/Next/MCP, respecting the actual dependency graph. Follow npm's authentication prompts. Verify each version before proceeding:

```bash
npm view @buchanan-solutions/logkit@ACTUAL_CORE_VERSION version dist.tarball --registry=https://registry.npmjs.org
```

Repeat using each package's actual version. If an upload fails halfway through, retain the successful versions and resume the missing ones; do not attempt to overwrite published versions. The default npm distribution tag is `latest`; use this procedure for the intended stable release, not an accidental prerelease.

Record package versions and their source commit. Once the release workflow safely handles npmjs and already-published versions, matching Git tags can identify that commit. The tag format is `logkit@VERSION`, `logkit-mcp@VERSION`, etc., without the scope.

## 5. Make subsequent releases tag-driven in GitHub Actions

### Configure npm Trusted Publishing

For each published package, open its npmjs settings and add a GitHub Actions trusted publisher:

- GitHub organization/user and repository: the actual source repository.
- Workflow filename: `build.yaml` if retaining the existing file; enter the filename, not `.github/workflows/build.yaml`.
- Environment: specify one only if the job actually uses that same GitHub environment.
- Explicitly allow direct `npm publish`; current new configurations otherwise allow staged publishing by default.

Use a GitHub-hosted runner, Node 24 and npm CLI 11.5.1 or newer. Allow `id-token: write` and `contents: read` on the release job. npm exchanges the workflow identity for short-lived credentials; no `NPM_TOKEN` secret is required. `npm whoami` is not an OIDC validation gate. See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

### Adapt the existing release job

Retain the existing check dependency, exact tag/version match and requirement that the tagged commit belongs to `main`. Keep publication restricted to release tags; ordinary pushes and pull requests should only check the code.

`scripts/release.mjs` now implements:

1. Query npmjs, preserve its exact-version skip behavior, and fail on lookup errors other than a genuine missing version.
2. Pack the selected package with pnpm into a fresh temporary directory.
3. Publish the resulting exact tarball using the npm CLI and the npmjs registry. This uses npm's documented OIDC support without assuming the repository's older pnpm publisher implements it.

The release job selects the pinned pnpm, install with the frozen lockfile, build, and call that updated script with `RELEASE_TAG`. Verify the npm CLI version in the runner. Use Node setup with the public registry and avoid dependency caching in the publishing job. Do not replace pnpm installation with `npm ci`; this repo uses a pnpm lockfile.

The job's relevant permission block becomes:

```yaml
permissions:
  contents: read
  id-token: write
```

Remove GitHub Packages-specific release permissions/concurrency naming where no longer needed. Do not inject a local npm login token into this OIDC job. If repository/workflow identities change, update the npm trusted publisher configuration too.

For each release, apply Changesets locally, commit versions, merge to main, and push the appropriate package tags on that commit. Publish dependency tags first and wait for their successful uploads before consumer tags; separate tag workflows can otherwise race. Initially keep the existing one-package-per-tag convention rather than adding a release orchestration system.

### If you really need a secret instead

Use a restricted npm granular publishing token stored as a GitHub Actions secret named `NPM_TOKEN`, exposed only to the publishing step as `NODE_AUTH_TOKEN`, with an npmjs auth mapping. Follow current npm [token creation requirements](https://docs.npmjs.com/creating-and-viewing-access-tokens/) and package 2FA policy; rotate it before expiration. Do not use `GITHUB_TOKEN` or put a token literal in `.npmrc`. This is a fallback if Trusted Publishing cannot be used, not the recommended setup.

## 6. Verify public consumption and finish the migration

Follow phase 3 of the deploy work package `openspec/changes/logkit-and-ts-mono/tasks.md`:

1. Replace ts-mono's six local tarball overrides with the actual published dependency versions. Remove the scope's old GitHub registry mapping, preserving unrelated registry settings. Regenerate the lockfile using pnpm.
2. Prove a fresh frozen-lockfile install in a disposable checkout without external LogKit sources, local tarballs or GitHub package credentials. Check the installed versions and registry resolutions.
3. Switch the logging MCP launchers to the published executable, preserving their service-specific environment and full mount URL:

```bash
source "$HOME/.nvm/nvm.sh" && nvm use 24 >/dev/null && exec npx --yes --registry=https://registry.npmjs.org --package=@buchanan-solutions/logkit-mcp@ACTUAL_MCP_VERSION logkit-mcp
```

4. Repeat all six MCP tool calls against real services, affected production builds and repo-wide `pnpm check`. The MCP package version can differ from core's.
5. Commit the public dependency/lockfile/launcher changes with the actual validation results.

A successful upload alone does not establish that consumers can install and run the published package. If a released version is defective, fix it and release a new version; do not plan on overwriting it.

## Prepared first-upload commands

The checks and artifact dry runs have no upload side effects. After explicitly deciding to publish, from the repository root run these one at a time. Each invocation packs the built package, checks for an existing version, then performs the real upload. Keep the versioned checkout unchanged between validation and upload. Reauthenticate if the login session has expired.

```bash
RELEASE_TAG=logkit@1.0.0 node scripts/release.mjs
RELEASE_TAG=logkit-otel@1.0.0 node scripts/release.mjs
RELEASE_TAG=logkit-redis@1.0.0 node scripts/release.mjs
RELEASE_TAG=logkit-fastify@1.0.0 node scripts/release.mjs
RELEASE_TAG=logkit-next@1.0.0 node scripts/release.mjs
RELEASE_TAG=logkit-mcp@1.0.0 node scripts/release.mjs
```

Stop after any failed command. Adding `--dry-run` packs and inspects without uploading or querying registry availability. The script removes its temporary archive afterward. For archival/review, use the manual packing commands above.

## Local readiness recorded — 2026-10-18

- `pnpm check` passed before the checkpoint and after the npm registry/version changes: builds and 87 tests passed. Biome reports existing nonblocking warnings. Python is outside this Node gate.
- Frozen-lockfile installation passed. The initial stable release is aligned to `1.0.0` for all six packages.
- All six real tarballs passed export/type/bin/license checks and `npm publish --dry-run`. Packed dependencies contain resolved versions rather than workspace/local pointers.
- Release script guard cases passed with fake executables: invalid version tag, existing release, auth failure, packing failure, missing release and dry-run behavior. The final MCP release script also passed a real artifact dry run.
- Read-only npm checks confirmed account `alex_buchanan` is an organization owner and all six prepared versions returned E404. This is a point-in-time check; publication still enforces registry permissions and version availability.
- No package was uploaded, no tag was created and nothing was pushed. GitHub OIDC publication requires configuring the package trusted publishers after the initial manual release; it has not been exercised locally.
