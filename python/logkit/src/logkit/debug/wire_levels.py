"""Wire severity names and Python logging level mapping."""

from __future__ import annotations

import logging

WIRE_LEVELS: tuple[str, ...] = ("trace", "debug", "info", "warn", "error", "fatal")
TRACE_LEVELNO = 5

_TRACE_REGISTERED = False


def ensure_trace_level() -> None:
    global _TRACE_REGISTERED
    if _TRACE_REGISTERED:
        return
    if logging.getLevelName(TRACE_LEVELNO) in ("Level 5", ""):
        logging.addLevelName(TRACE_LEVELNO, "TRACE")
    _TRACE_REGISTERED = True


def wire_logger_id(name: str) -> str:
    if name in ("", "root"):
        return "root"
    return name


def python_logger_name(wire_id: str) -> str:
    if wire_id == "root":
        return "root"
    return wire_id


def get_logger_by_wire_id(wire_id: str) -> logging.Logger:
    name = python_logger_name(wire_id)
    if name == "root":
        return logging.root
    return logging.getLogger(name)


def levelno_to_wire(levelno: int) -> str:
    ensure_trace_level()
    if levelno == TRACE_LEVELNO:
        return "trace"
    if levelno == logging.WARNING:
        return "warn"
    if levelno == logging.CRITICAL:
        return "fatal"
    if levelno == logging.DEBUG:
        return "debug"
    if levelno == logging.INFO:
        return "info"
    if levelno == logging.ERROR:
        return "error"
    name = logging.getLevelName(levelno)
    if isinstance(name, str):
        lowered = name.lower()
        if lowered in WIRE_LEVELS:
            return lowered
        if lowered == "warning":
            return "warn"
        if lowered == "critical":
            return "fatal"
    return "info"


def configured_level_to_wire(levelno: int) -> str:
    if levelno == logging.NOTSET:
        return "notset"
    return levelno_to_wire(levelno)


def wire_to_levelno(level: str) -> int:
    ensure_trace_level()
    normalized = level.lower()
    mapping = {
        "trace": TRACE_LEVELNO,
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warn": logging.WARNING,
        "error": logging.ERROR,
        "fatal": logging.CRITICAL,
    }
    if normalized not in mapping:
        raise ValueError(normalized)
    return mapping[normalized]


def parse_level_body(body: object) -> tuple[str | None, str | None]:
    """Return (wire_level, error_message)."""
    if body is None or not isinstance(body, dict):
        return None, "body must be a JSON object"
    raw = body.get("level")
    if not isinstance(raw, str):
        return None, "level must be a string"
    level = raw.lower()
    if level not in WIRE_LEVELS:
        return None, f"level must be one of: {', '.join(WIRE_LEVELS)}"
    return level, None
