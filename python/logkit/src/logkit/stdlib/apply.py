# src/shared/logging/apply.py
"""Activate logging configuration (explicit runtime side effect)."""

from __future__ import annotations

from copy import deepcopy
from logging.config import dictConfig

from logkit.stdlib.export import export_config
from logkit.stdlib.state import LoggingState


def apply_config(config: dict) -> None:
    """Apply a logging dictConfig. Idempotent with respect to configuration intent."""
    dictConfig(deepcopy(config))


def apply_state(state: LoggingState) -> None:
    """Compile state and apply via :func:`logging.config.dictConfig`."""
    apply_config(export_config(state))
