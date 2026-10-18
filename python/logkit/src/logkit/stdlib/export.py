# src/shared/logging/export.py
"""Serialize :class:`LoggingState` to a stdlib ``dictConfig`` mapping."""

from __future__ import annotations

import logging
from copy import deepcopy

from logkit.stdlib.state import LoggingState


def export_config(state: LoggingState) -> dict:
    """Pure conversion; safe to pass to other processes (e.g. Uvicorn ``log_config``)."""
    log = logging.getLogger(__name__)
    log.info("Exporting logging config")
    config = {
        "version": state.version,
        "disable_existing_loggers": state.disable_existing_loggers,
        "formatters": deepcopy(state.formatters),
        "handlers": deepcopy(state.handlers),
        "root": deepcopy(state.root),
        "loggers": {k: deepcopy(v) for k, v in state.loggers.items()},
    }
    log.debug("Logging config: %s", config)
    return config
