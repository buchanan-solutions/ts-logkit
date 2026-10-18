# src/shared/logging/bootstrap.py
"""Define initial :class:`LoggingState` (no runtime or I/O)."""

from __future__ import annotations

import logging
from typing import Any

from logkit.stdlib.state import LoggingState


def bootstrap(
    *,
    root_level: int = logging.WARNING,
    logger_levels: dict[str, int] | None = None,
    formatters: dict[str, dict[str, Any]] | None = None,
    handlers: dict[str, dict[str, Any]] | None = None,
    disable_existing_loggers: bool = False,
    rich: bool = False,
) -> LoggingState:
    """
    Create baseline logging state: one default console handler and optional per-logger levels.

    Per-logger entries only set ``level`` so events propagate to the root handlers.

    ``handlers`` must be ``dictConfig``-style definitions (nested dicts), not live
    :class:`logging.Handler` instances. Custom handlers typically use
    ``{"handler_id": {"()": "package.module.factory"}}`` where ``factory`` returns a
    handler. See ``USAGE.md`` in the ``pytools.logging`` package source tree.
    """

    default_handler = "logkit.stdlib.factories.create_colored_level_handler"
    if rich:
        default_handler = "logkit.stdlib.factories.create_rich_console_handler"

    # Set pytools.logging to WARNING by default, but allow user override
    lv = dict(logger_levels) if logger_levels else {}
    # lv.setdefault("pytools.logging", logging.WARNING)
    loggers = {name: {"level": level} for name, level in lv.items()}
    fmt = dict(formatters) if formatters else {}
    if handlers:
        hdl = dict(handlers)
        root_handlers = list(hdl.keys())
    else:
        hdl = {"default": {"()": default_handler}}
        root_handlers = ["default"]
    return LoggingState(
        version=1,
        disable_existing_loggers=disable_existing_loggers,
        formatters=fmt,
        handlers=hdl,
        root={"level": root_level, "handlers": root_handlers},
        loggers=loggers,
    )
