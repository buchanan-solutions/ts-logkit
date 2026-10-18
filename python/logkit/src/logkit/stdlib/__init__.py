# src/shared/logging/__init__.py
"""Phased logging infrastructure: bootstrap → resolve → mutate → apply → export."""

import logging

from logkit.stdlib.apply import apply_config, apply_state
from logkit.stdlib.bootstrap import bootstrap
from logkit.stdlib.export import export_config
from logkit.stdlib.formatters.level_color_formatter import LevelColorFormatter
from logkit.stdlib.formatters.styles import _LOGGER_STYLE
from logkit.stdlib.loggable import Loggable
from logkit.stdlib.mutate import (
    merge_logger_levels,
    merge_logger_specs,
    set_root_handlers,
    set_root_level,
)
from logkit.stdlib.one_shot import one_shot
from logkit.stdlib.resolve import resolve_logging_env_path
from logkit.stdlib.state import LoggingState

logging.getLogger("logkit.stdlib").setLevel(logging.WARNING)

__all__ = [
    "_LOGGER_STYLE",
    "one_shot",
    "LevelColorFormatter",
    "Loggable",
    "LoggingState",
    "apply_config",
    "apply_state",
    "bootstrap",
    "export_config",
    "merge_logger_levels",
    "merge_logger_specs",
    "resolve_logging_env_path",
    "set_root_handlers",
    "set_root_level",
]
