import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const registry = "https://registry.npmjs.org";
const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--dry-run")) throw new Error("Only --dry-run is supported");
const dryRun = args.includes("--dry-run");
const tag = process.env.RELEASE_TAG ?? "";
const match = /^(logkit(?:-[a-z0-9-]+)?)@(\d+\.\d+\.\d+)$/.exec(tag);
if (!match) throw new Error(`Expected package@version tag, e.g. logkit@0.6.0; got ${tag}`);
const packages = readdirSync(new URL("../packages/", import.meta.url)).map((directory) => {
  const path = new URL(`../packages/${directory}/package.json`, import.meta.url);
  return { ...JSON.parse(readFileSync(path, "utf8")), directory };
});
const pkg = packages.find((candidate) => candidate.name === `@buchanan-solutions/${match[1]}`);
if (!pkg || pkg.private || pkg.version !== match[2]) {
  throw new Error(`Tag ${tag} must match a public workspace package and its committed version`);
}
if (pkg.publishConfig?.registry !== registry || pkg.publishConfig?.access !== "public") {
  throw new Error(`${pkg.name} must explicitly target public npm`);
}

// Dry runs inspect the artifact without a registry lookup or authentication requirement.
if (!dryRun) {
  const result = spawnSync(
    "npm",
    ["view", `${pkg.name}@${pkg.version}`, "version", "--json", "--registry", registry],
    { cwd: root, encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status === 0) {
    if (JSON.parse(result.stdout) !== pkg.version)
      throw new Error("Unexpected registry version response");
    console.log(`${pkg.name}@${pkg.version} already published; skipping`);
    process.exit(0);
  }
  let response;
  try {
    response = JSON.parse(result.stdout);
  } catch {
    /* Report the registry failure below. */
  }
  if (response?.error?.code !== "E404") {
    throw new Error(`Registry lookup failed: ${result.stderr || result.stdout}`);
  }
}

const destination = mkdtempSync(join(tmpdir(), "logkit-publish-"));
try {
  const pack = spawnSync("pnpm", ["pack", "--pack-destination", destination], {
    cwd: join(root, "packages", pkg.directory),
    stdio: "inherit",
  });
  if (pack.error) throw pack.error;
  if (pack.status !== 0) throw new Error(`Packing ${pkg.name} failed (${pack.status})`);
  const archives = readdirSync(destination).filter((name) => name.endsWith(".tgz"));
  if (archives.length !== 1) throw new Error("Expected exactly one packed artifact");
  const publishArgs = [
    "publish",
    join(destination, archives[0]),
    "--access",
    "public",
    "--registry",
    registry,
  ];
  if (dryRun) publishArgs.push("--dry-run");
  const publish = spawnSync("npm", publishArgs, { cwd: root, stdio: "inherit" });
  if (publish.error) throw publish.error;
  process.exitCode = publish.status ?? 1;
} finally {
  rmSync(destination, { recursive: true, force: true });
}
