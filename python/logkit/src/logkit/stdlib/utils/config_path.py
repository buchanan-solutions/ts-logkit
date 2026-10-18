# src/shared/logging/utils/config_path.py
"""Locate and resolve paths to per-logger config files (e.g. logging.env)."""

from __future__ import annotations

import sys
from collections.abc import Iterable
from pathlib import Path

# Default filename when searching under cwd and sys.path (documented public contract).
DEFAULT_LOGGING_ENV_FILENAME = "logging.env"


def iter_default_config_search_roots() -> list[Path]:
    """
    Distinct directories to search: current working directory, then each ``sys.path``
    entry that marks an existing directory. No relative ``..`` crawling.
    """
    seen: set[Path] = set()
    roots: list[Path] = []
    for candidate in (Path.cwd().resolve(), *(_path_entry_as_dir(p) for p in sys.path)):
        if candidate is None or candidate in seen:
            continue
        seen.add(candidate)
        roots.append(candidate)
    return roots


def _path_entry_as_dir(entry: str) -> Path | None:
    if not entry:
        return None
    p = Path(entry)
    return p.resolve() if p.is_dir() else None


def find_logging_config_file(
    filename: str = DEFAULT_LOGGING_ENV_FILENAME,
    *,
    search_roots: Iterable[Path] | None = None,
) -> str | None:
    """Return the first existing ``root / filename`` among ``search_roots``."""
    roots = (
        list(search_roots)
        if search_roots is not None
        else iter_default_config_search_roots()
    )
    for root in roots:
        candidate = root / filename
        if candidate.is_file():
            return str(candidate)
    return None


def resolve_logging_config_path(
    cli_path: str | None = None,
    *,
    env_var: str = "PYTOOLS_LOGGING_CONFIG_FILE",
    default_filename: str = DEFAULT_LOGGING_ENV_FILENAME,
    search_roots: Iterable[Path] | None = None,
) -> str | None:
    """
    Resolve path to a logging config file.

    Thin wrapper around :func:`pytools.logging.resolve.resolve_logging_env_path`.
    ``default_filename`` and ``search_roots`` are unused (kept for call-site compatibility).
    """
    from logkit.stdlib.resolve import resolve_logging_env_path

    return resolve_logging_env_path(cli_path, env_var=env_var)
