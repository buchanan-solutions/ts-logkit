"""Mount path normalization (parity with TypeScript mount.ts)."""

from __future__ import annotations


def normalize_mount(mount: str) -> str:
    trimmed = mount.strip()
    if not trimmed or trimmed == "/":
        return "/"
    with_slash = trimmed if trimmed.startswith("/") else f"/{trimmed}"
    stripped = with_slash.rstrip("/")
    return stripped or "/"


def pathname_under_mount(pathname: str, mount: str) -> str | None:
    m = normalize_mount(mount)
    path = pathname if pathname.startswith("/") else f"/{pathname}"
    path = path.rstrip("/") or "/"

    if m == "/":
        return path

    if path == m:
        return "/"

    prefix = f"{m}/"
    if not path.startswith(prefix):
        return None

    relative = path[len(m) :] or "/"
    return relative
