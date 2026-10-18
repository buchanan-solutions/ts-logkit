# src/shared/logging/factories.py
"""Callable factories referenced by logging dictConfig (``()`` handler entries)."""

from __future__ import annotations

import logging
import sys

from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme

from logkit.stdlib.formatters.level_color_formatter import LevelColorFormatter
from logkit.stdlib.formatters.styles import (
    _LOGGER_RICH_CLOSE,
    _LOGGER_RICH_OPEN,
    _LOGGER_STYLE,
    _RESET,
)

_LOG_THEME = Theme(
    {
        "log.path": "dim italic bright_black",
    }
)


def create_colored_level_handler() -> logging.Handler:
    """Rich console handler used as the default sink (import path stable for workers)."""
    formatter = LevelColorFormatter(
        fmt=f"[%(asctime)s] %(levelname)s {_LOGGER_STYLE}%(name)s{_RESET} %(message)s",
        datefmt="%y/%m/%d %H:%M:%S",
    )
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(formatter)
    return handler


def create_rich_console_handler() -> logging.Handler:
    """Rich console handler used as the default sink (import path stable for workers)."""

    console = Console(
        force_terminal=True,
        theme=_LOG_THEME,
        width=None,  # None disables Rich's width constraint
    )

    formatter = LevelColorFormatter(
        fmt=f"{_LOGGER_RICH_OPEN}%(name)s{_LOGGER_RICH_CLOSE} %(message)s",
        datefmt="%y/%m/%d %H:%M:%S",
    )
    handler = RichHandler(
        rich_tracebacks=True,
        show_time=True,
        omit_repeated_times=False,
        show_path=True,
        markup=True,
        console=console,
    )
    handler._log_render.show_time = True
    handler._log_render.time_format = "[%X]"
    handler.setFormatter(formatter)
    return handler
