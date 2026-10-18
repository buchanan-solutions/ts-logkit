# src/shared/logging/resolve.py
"""Read-only discovery of logging env file path (no runtime logging effects)."""

from __future__ import annotations

import logging
import os
from pathlib import Path

__DEFAULT_LOGGING_ENV_FILENAME = ".env.pytools_logging"


def _find_project_root(start: Path | None = None) -> Path | None:
    """
    Walk upward from ``start`` (default: cwd) for ``pyproject.toml`` or ``.git``.

    Returns ``None`` if no marker is found.
    """
    cur = (start or Path.cwd()).resolve()
    for candidate in (cur, *cur.parents):
        if (candidate / "pyproject.toml").is_file():
            return candidate
        if (candidate / ".git").exists():
            return candidate
    return None


def resolve_logging_env_path(
    explicit_path: str | None = None,
    *,
    env_var: str = __DEFAULT_LOGGING_ENV_FILENAME,
) -> str | None:
    f"""
    Resolve path to a ``logging.env``-style file.

    Precedence (caller ``explicit_path`` is supplied by the app, e.g. CLI):

    1. Non-empty ``explicit_path``
    2. ``os.environ[env_var]`` when set (default env name ``PYTOOLS_LOGGING_CONFIG_FILE``)
    3. ``{{project_root}}/{__DEFAULT_LOGGING_ENV_FILENAME}`` if it exists (project root via :func:`find_project_root`)

    Returns ``None`` if no path applies.
    """
    log = logging.getLogger(__name__)
    if explicit_path:
        log.debug("Using explicit logging env path: %s", explicit_path)
        return explicit_path
    env_path = os.environ.get(env_var)
    if env_path:
        log.debug("Using environment variable %s: %s", env_var, env_path)
        return env_path
    proj = _find_project_root()
    root = proj if proj is not None else Path.cwd().resolve()
    candidate = root / __DEFAULT_LOGGING_ENV_FILENAME
    log.debug("Using project root logging env path: %s", candidate)
    return str(candidate) if candidate.is_file() else None
