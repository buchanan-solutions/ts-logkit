# Publishing LogKit to public npm

Checked against the repository and npm documentation on 2026-10-18.

## Repeat a manual release from your terminal

This is the local login-and-publish procedure Alex used on 2026-10-18. All six packages were successfully published at `1.0.0`; that release is complete. Manual publishing does not require a Git push, release tag, or GitHub Actions. Python/PyPI publishing is separate.

### 1. Open the checkout and select the existing tools

```bash
cd /path/to/logkit
source "$HOME/.nvm/nvm.sh"
nvm use 24
node --version
npm --version
pnpm --version
```

Use the pnpm version pinned in this checkout's `package.json` (currently `10.6.3`). The successful October 18 terminal used Node `24.22.0` and npm `11.19.1`. If the checkout moves, change only the `cd` path.

### 2. Prepare new versions, unless already prepared and committed

Use **Changesets for release versioning and changelogs for all six TypeScript packages under `packages/`**. Use pnpm to install/manage dependencies and npm to upload the packed releases. Do not use `npm version`, hand-edit release versions, or force every package to the same version as the routine release process.

When a publishable change is ready, run `pnpm changeset`, select the affected packages, select patch/minor/major, and write a release note. Review and commit the generated `.changeset/*.md` file with the change. At release time, `pnpm run version` consumes pending changesets, updates package versions and changelogs, and adjusts internal dependency ranges as configured; then regenerate the lockfile. Review any dependent-package bumps. The packages are independently versioned (`fixed` and `linked` groups are empty), so they need not all advance together. Python packages are outside this Changesets workflow.

For a new release, describe the changes and choose the appropriate patch/minor/major bumps:

```bash
pnpm install --frozen-lockfile
pnpm changeset
pnpm exec changeset status
pnpm run version
pnpm install --lockfile-only
```

Review the manifests, changelogs, internal dependency updates and lockfile. Packages can have different versions. Do not rerun versioning when someone has already prepared the release; doing so was explicitly unnecessary for the October 18 `1.0.0` release. npm cannot overwrite an existing version. Unchanged packages can remain at their existing versions.

### 3. Validate and commit the final release state

```bash
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs lint, builds all packages, and runs tests. Stop on failure. If pnpm reports an unexpected fallback `.pnpm-store`, resolve store access before continuing; do not repeatedly retry a sandboxed install.

Review and commit the intended source, versions, changelogs and lockfile before uploading. Review `git status --short` and stage the intended files explicitly. Record the release commit:

```bash
git status --short
git log -1 --format='%h %s'
```

For each package you intend to publish, inspect its artifact without uploading. This example reads the core version from its manifest:

```bash
RELEASE_TAG="$(node -p "const p=require('./packages/logkit/package.json'); p.name.split('/')[1]+'@'+p.version")" node scripts/release.mjs --dry-run
```

Repeat for changed adapters by replacing `packages/logkit/package.json` with their package manifest path. Inspect the listed files, exports, types, executable and resolved dependency versions. The detailed artifact checks below explain what to inspect. Keep source and built outputs unchanged between validation and publication.

### 4. Authenticate locally immediately before publishing

```bash
npm login --registry=https://registry.npmjs.org --auth-type=web
npm whoami --registry=https://registry.npmjs.org
```

Open the URL printed by npm if a browser does not open automatically. Sign into the npm account with access to `buchanan-solutions`, complete the browser/2FA prompts, approve CLI access, and return to the terminal. During the October 18 release Alex reported receiving a two-hour publishing credential; use the expiry shown by npm rather than assuming every future login has the same duration. The expected account during that release was `alex_buchanan`.

Keep credentials in npm's user configuration, never in this repository or chat. No token needs to be copied into a script. `npm whoami` confirms identity but does not prove publishing authorization: the first October 18 attempt passed `whoami` and still failed publication authentication. Refresh login and complete 2FA if that happens. Do not change a package version merely because authentication failed. See [npm login](https://docs.npmjs.com/cli/v11/commands/npm-login/) and [publishing with 2FA](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).

### 5. Publish one package at a time, in this order

These are real public uploads. Run each line separately and wait for success before the next. Each command reads that package's committed version, so no remembered or manually substituted semver is needed:

```bash
RELEASE_TAG="$(node -p "const p=require('./packages/logkit/package.json'); p.name.split('/')[1]+'@'+p.version")" node scripts/release.mjs
RELEASE_TAG="$(node -p "const p=require('./packages/logkit-otel/package.json'); p.name.split('/')[1]+'@'+p.version")" node scripts/release.mjs
RELEASE_TAG="$(node -p "const p=require('./packages/logkit-redis/package.json'); p.name.split('/')[1]+'@'+p.version")" node scripts/release.mjs
RELEASE_TAG="$(node -p "const p=require('./packages/logkit-fastify/package.json'); p.name.split('/')[1]+'@'+p.version")" node scripts/release.mjs
RELEASE_TAG="$(node -p "const p=require('./packages/logkit-next/package.json'); p.name.split('/')[1]+'@'+p.version")" node scripts/release.mjs
RELEASE_TAG="$(node -p "const p=require('./packages/logkit-mcp/package.json'); p.name.split('/')[1]+'@'+p.version")" node scripts/release.mjs
```

`RELEASE_TAG` here is an environment variable selecting a package/version; it does not create or push a Git tag. The script checks npm, skips an already-published version, packs with pnpm to resolve `workspace:` dependencies, and uploads that tarball with npm. Stop on any error. For an expired credential, repeat step 4 and retry only the failed command. Already-successful packages do not need another version bump or upload. If npm already contains a version but its contents are wrong, fix the source and release a new version.

### 6. Verify public npm after the uploads

```bash
for package in logkit logkit-otel logkit-redis logkit-fastify logkit-next logkit-mcp; do
  spec="$(node -p "const p=require('./packages/$package/package.json'); p.name+'@'+p.version")"
  npm view "$spec" version dist.tarball --registry=https://registry.npmjs.org || break
done
```

All six lookups should return the intended version and a public tarball URL. Stop and investigate any failed lookup. Record the versions and source commit. Git tags are optional release records for this manual path; pushing package tags can trigger the separate release workflow once that workflow is present remotely. Do not push tags merely to perform the local uploads above.

## Background and CI setup

The following sections retain the original preparation, artifact-inspection and optional CI instructions. Start with the checklist above for an ordinary manual release.

## Recommended approach

Publish the first release manually from your machine. This establishes the npm packages and lets you verify account permissions, package contents and public installation directly. Then move subsequent releases to the existing tag-driven GitHub Actions workflow, using npm Trusted Publishing (OIDC) rather than a stored npm publishing token.

Keep pnpm for installation, Changesets, checks, builds and packing. Use the npm CLI to upload the resulting tarballs. Publishing this way does not migrate the project away from pnpm.

The repository targets public npm. All six `1.0.0` packages were published manually on 2026-10-18. Local annotated package tags were added on 2026-10-19; they have not been pushed. The newer tag-driven workflow remains local until the release branch reaches remote main; npm trusted-publisher setup has not been verified. Python/PyPI releases are separate.

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

Work in `/path/to/logkit`. Before any release, review and commit these changes:

- Change `.npmrc`'s `@buchanan-solutions` registry mapping to `https://registry.npmjs.org`.
- Change all six package manifests' `publishConfig.registry` to that URL; keep `publishConfig.access` as `public`.
- Change the hardcoded registry in `scripts/release.mjs` and the registry settings in `.github/workflows/build.yaml`. The script and workflow now target npmjs; keep them aligned.
- Remove the release job's use of `secrets.GITHUB_TOKEN` as `NODE_AUTH_TOKEN` when using OIDC. That token cannot publish to npmjs. Keep unrelated GitHub permissions/authentication where needed.
- Check each package's name, license, repository URL, exports, types and included files. Keep repository URLs aligned with the actual GitHub repository; current manifests identify `buchanan-solutions/ts-logkit`.

Do not push release tags while the old workflow still targets GitHub Packages. A manual first release does not require CI publishing to be enabled, but disable or migrate the old release path before pushing its matching tags.

### Apply and inspect versions (already applied for this release)

```bash
cd /path/to/logkit
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
- At the readiness checkpoint, nothing had been uploaded or pushed. Later that evening all six `1.0.0` packages were published manually. On 2026-10-19 their public versions and shipped files were verified, and six local annotated tags were created at `ceb1fc9`. Tags and the release branch remain unpushed. GitHub OIDC publication has not been verified.
