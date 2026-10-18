import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const registry = "https://npm.pkg.github.com";
const tag = process.env.RELEASE_TAG ?? "";
const match = /^(logkit(?:-[a-z0-9-]+)?)@(\d+\.\d+\.\d+)$/.exec(tag);
if (!match) throw new Error(`Expected package@version tag, e.g. logkit@0.5.0; got ${tag}`);
const packages = readdirSync(new URL("../packages/", import.meta.url)).map((directory) => {
  const path = new URL(`../packages/${directory}/package.json`, import.meta.url);
  return JSON.parse(readFileSync(path, "utf8"));
});
const pkg = packages.find((candidate) => candidate.name === `@buchanan-solutions/${match[1]}`);
if (!pkg || pkg.private || pkg.version !== match[2]) {
  throw new Error(`Tag ${tag} must match a public workspace package and its committed version`);
}
const result = spawnSync(
  "npm",
  ["view", `${pkg.name}@${pkg.version}`, "version", "--json", "--registry", registry],
  { encoding: "utf8" },
);
if (result.error) throw result.error;
if (result.status === 0) {
  if (JSON.parse(result.stdout) !== pkg.version)
    throw new Error("Unexpected registry version response");
  console.log(`${pkg.name}@${pkg.version} already published; skipping`);
} else {
  let response;
  try {
    response = JSON.parse(result.stdout);
  } catch {
    /* Report the registry failure below. */
  }
  if (response?.error?.code !== "E404") {
    throw new Error(`Registry lookup failed: ${result.stderr || result.stdout}`);
  }
  const publish = spawnSync(
    "pnpm",
    [
      "--filter",
      pkg.name,
      "publish",
      "--no-git-checks",
      "--access",
      "public",
      "--registry",
      registry,
    ],
    { stdio: "inherit" },
  );
  if (publish.error) throw publish.error;
  process.exitCode = publish.status ?? 1;
}
