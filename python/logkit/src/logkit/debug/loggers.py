"""Live stdlib logger introspection and level control."""

from __future__ import annotations

import logging
from logging import PlaceHolder

from logkit.debug.wire_levels import (
    configured_level_to_wire,
    get_logger_by_wire_id,
    levelno_to_wire,
    wire_logger_id,
    wire_to_levelno,
)

# Loggers explicitly updated via PUT (may not yet appear in loggerDict).
_touched_wire_ids: set[str] = set()


def _is_real_logger(obj: object) -> bool:
    return isinstance(obj, logging.Logger)


def _collect_list_ids() -> set[str]:
    ids: set[str] = set(_touched_wire_ids)
    ids.add("root")
    manager = logging.root.manager
    for name, obj in manager.loggerDict.items():
        if isinstance(obj, PlaceHolder):
            continue
        if _is_real_logger(obj):
            ids.add(wire_logger_id(name))
    return ids


def _lookup_configured_wire(wire_id: str) -> str:
    logger = get_logger_by_wire_id(wire_id)
    return configured_level_to_wire(logger.level)


def _effective_wire(wire_id: str) -> str:
    logger = get_logger_by_wire_id(wire_id)
    return levelno_to_wire(logger.getEffectiveLevel())


def logger_info(wire_id: str) -> dict[str, str]:
    return {
        "id": wire_id,
        "configured": _lookup_configured_wire(wire_id),
        "effective": _effective_wire(wire_id),
    }


def list_logger_levels() -> list[dict[str, str]]:
    return [logger_info(wid) for wid in sorted(_collect_list_ids())]


def update_logger_level(wire_id: str, wire_level: str) -> dict[str, str]:
    levelno = wire_to_levelno(wire_level)
    logger = get_logger_by_wire_id(wire_id)
    logger.setLevel(levelno)
    _touched_wire_ids.add(wire_id)
    return logger_info(wire_id)


def unset_logger_level(wire_id: str) -> dict[str, str]:
    logger = get_logger_by_wire_id(wire_id)
    logger.setLevel(logging.NOTSET)
    _touched_wire_ids.add(wire_id)
    return logger_info(wire_id)


def reset_touched_loggers_for_tests() -> None:
    _touched_wire_ids.clear()
