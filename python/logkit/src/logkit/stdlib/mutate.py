# src/shared/logging/mutate.py
"""Controlled updates to :class:`LoggingState` (no Python logging side effects)."""

from __future__ import annotations

import logging
from copy import deepcopy
from typing import Any

from logkit.stdlib.state import LoggingState


def set_root_level(state: LoggingState, level: int) -> LoggingState:
    log = logging.getLogger(__name__)
    log.debug("Setting root level to %s", level)
    s = deepcopy(state)
    s.root["level"] = level
    return s


def set_root_handlers(state: LoggingState, handlers: list[str]) -> LoggingState:
    log = logging.getLogger(__name__)
    log.debug("Setting root handlers to %s", handlers)
    s = deepcopy(state)
    s.root["handlers"] = list(handlers)
    return s


def merge_logger_levels(state: LoggingState, levels: dict[str, int]) -> LoggingState:
    """Merge per-logger levels; keys in ``levels`` overwrite existing levels for that name."""
    log = logging.getLogger(__name__)
    log.info("Merging new logger levels")
    log.debug("New logger levels: %s", levels)
    s = deepcopy(state)
    for name, level in levels.items():
        spec: dict[str, Any] = dict(s.loggers.get(name, {}))
        spec["level"] = level
        s.loggers[name] = spec
    return s


def merge_logger_specs(
    state: LoggingState, specs: dict[str, dict[str, Any]]
) -> LoggingState:
    """Deep-merge arbitrary logger dictConfig fragments (e.g. handlers, propagate)."""
    log = logging.getLogger(__name__)
    log.info("Merging new logger specs")
    log.debug("New logger specs: %s", specs)
    s = deepcopy(state)
    for name, fragment in specs.items():
        base = dict(s.loggers.get(name, {}))
        merged = {**base, **fragment}
        s.loggers[name] = merged
    return s
