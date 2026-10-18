# src/shared/logging/state.py
"""Authoritative logging configuration before runtime activation."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any


@dataclass
class LoggingState:
    """
    In-memory source of truth for logging intent.

    Compilable to stdlib ``dictConfig`` via :func:`pytools.logging.export.export_config`.
    Mutations should go through :mod:`pytools.logging.mutate` helpers to preserve copies.
    """

    version: int = 1
    disable_existing_loggers: bool = False
    formatters: dict[str, dict[str, Any]] = field(default_factory=dict)
    handlers: dict[str, dict[str, Any]] = field(default_factory=dict)
    root: dict[str, Any] = field(
        default_factory=lambda: {
            "level": logging.INFO,
            "handlers": [],
        }
    )
    loggers: dict[str, dict[str, Any]] = field(default_factory=dict)
