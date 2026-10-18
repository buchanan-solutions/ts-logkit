/**
 * Normalize a mount path: absolute, no trailing slash (`/` stays `/`).
 */
export function normalizeMount(mount: string): string {
  const trimmed = mount.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const stripped = withSlash.replace(/\/+$/, "");
  return stripped || "/";
}

/**
 * Normalize a complete debug base URL (origin + optional mount path) or same-origin relative base.
 */
export function normalizeDebugBase(base: string): string {
  const trimmed = base.trim();
  if (!trimmed) {
    throw new Error("debug base URL is required");
  }
  if (trimmed.startsWith("/")) {
    return normalizeMount(trimmed);
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`invalid debug base URL: ${base}`);
  }
  const path = normalizeMount(url.pathname || "/");
  if (path === "/") {
    return url.origin;
  }
  return `${url.origin}${path}`;
}

/**
 * If `pathname` is under `mount`, return the path relative to the mount (always starts with `/`).
 * Rejects prefix lookalikes (`/api/logging-other` is not under `/api/logging`).
 */
export function pathnameUnderMount(pathname: string, mount: string): string | null {
  const m = normalizeMount(mount);
  let path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  path = path.replace(/\/+$/, "") || "/";

  if (m === "/") {
    return path;
  }

  if (path === m) {
    return "/";
  }

  const prefix = `${m}/`;
  if (!path.startsWith(prefix)) {
    return null;
  }

  return path.slice(m.length) || "/";
}

/**
 * Append a contract endpoint suffix (`/health`, `/tail`, …) to a normalized debug base.
 */
export function joinDebugSuffix(base: string, suffix: string): string {
  const normalized = normalizeDebugBase(base);
  const suf = suffix.startsWith("/") ? suffix : `/${suffix}`;
  if (normalized.startsWith("/")) {
    const mount = normalizeMount(normalized);
    if (mount === "/") return suf;
    return `${mount}${suf}`;
  }
  return `${normalized}${suf}`;
}
