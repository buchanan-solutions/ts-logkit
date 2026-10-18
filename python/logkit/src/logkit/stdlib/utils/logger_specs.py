# src/shared/logging/utils/logger_specs.py
"""Parse CLI or config strings into per-logger level mappings."""

from __future__ import annotations

import logging
from collections.abc import Iterable


def parse_logger_level_specs(specs: Iterable[str]) -> dict[str, int]:
    """
    Parse entries of the form ``name|level`` into ``{logger_name: logging level}``.

    Level names match ``logging`` module attributes (e.g. ``DEBUG``, ``info``).

    Raises:
        ValueError: If a spec is malformed or the level is unknown.
    """
    out: dict[str, int] = {}
    for spec in specs:
        if "|" not in spec:
            raise ValueError(f"expected name|level, got: {spec!r}")
        name, level = spec.split("|", 1)
        name, level = name.strip(), level.strip()
        if not name or not level:
            raise ValueError(f"invalid logger spec: {spec!r}")
        try:
            out[name] = getattr(logging, level.upper())
        except AttributeError as e:
            raise ValueError(f"unknown log level in {spec!r}: {level!r}") from e
    return out
