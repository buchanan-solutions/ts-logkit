from __future__ import annotations

import logging

import pytest

from logkit.debug.loggers import reset_touched_loggers_for_tests


@pytest.fixture(autouse=True)
def _reset_logging_touched() -> None:
    reset_touched_loggers_for_tests()
    yield
    reset_touched_loggers_for_tests()


@pytest.fixture
def isolated_root_level() -> None:
    root = logging.root
    prev = root.level
    root.setLevel(logging.WARNING)
    yield
    root.setLevel(prev)
