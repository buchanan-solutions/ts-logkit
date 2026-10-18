"""Stdlib logging handler that captures records into a ring."""

from __future__ import annotations

import json
import logging
import traceback
from typing import Any

from logkit.debug.wire_levels import levelno_to_wire, wire_logger_id
from logkit.ring.buffer import RingBuffer


def _serialize_args(args: tuple[Any, ...] | None) -> list[Any] | None:
    if not args:
        return None
    try:
        return json.loads(json.dumps(list(args), default=str))
    except (TypeError, ValueError):
        out: list[Any] = []
        for arg in args:
            try:
                out.append(json.loads(json.dumps(arg, default=str)))
            except (TypeError, ValueError):
                out.append(str(arg))
        return out or None


def _serialize_exc_info(
    exc_info: tuple[type[BaseException], BaseException, Any] | None,
) -> dict[str, str] | None:
    if not exc_info or exc_info[0] is None:
        return None
    exc_type, exc_value, _tb = exc_info
    name = getattr(exc_type, "__name__", "Error")
    message = str(exc_value) if exc_value is not None else ""
    stack = "".join(traceback.format_exception(exc_type, exc_value, _tb))
    err: dict[str, str] = {"name": name, "message": message}
    if stack:
        err["stack"] = stack
    return err


class RingHandler(logging.Handler):
    """Captures log records into an in-process ring (level NOTSET by default)."""

    def __init__(self, ring: RingBuffer[dict[str, Any]]) -> None:
        super().__init__(level=logging.NOTSET)
        self.ring = ring

    def emit(self, record: logging.LogRecord) -> None:
        try:
            message = record.getMessage()
            line: dict[str, Any] = {
                "ts": int(record.created * 1000),
                "logger_id": wire_logger_id(record.name),
                "level": levelno_to_wire(record.levelno),
                "message": message,
            }
            args = _serialize_args(record.args if isinstance(record.args, tuple) else None)
            if args:
                line["args"] = args
            err = _serialize_exc_info(record.exc_info)
            if err:
                line["error"] = err
            self.ring.push(dict(line))
        except Exception:
            return
