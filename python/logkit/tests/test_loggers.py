from __future__ import annotations

import logging

from logkit.debug.loggers import list_logger_levels, logger_info, unset_logger_level, update_logger_level
from logkit.debug.wire_levels import parse_level_body


def test_parse_level_body_errors() -> None:
    assert parse_level_body(None)[1] == "body must be a JSON object"
    assert parse_level_body({"level": 1})[1] == "level must be a string"
    assert parse_level_body({"level": "verbose"})[1] == (
        "level must be one of: trace, debug, info, warn, error, fatal"
    )


def test_unknown_logger_get_notset(isolated_root_level: None) -> None:
    info = logger_info("unknown.child")
    assert info["configured"] == "notset"
    assert info["effective"] == "warn"


def test_put_pin_and_unset(isolated_root_level: None) -> None:
    updated = update_logger_level("server", "debug")
    assert updated["configured"] == "debug"
    assert updated["effective"] == "debug"
    after = unset_logger_level("server")
    assert after["configured"] == "notset"
    assert after["effective"] == "warn"


def test_child_pin_independent(isolated_root_level: None) -> None:
    parent = logging.getLogger("parent")
    parent.setLevel(logging.INFO)
    child = logging.getLogger("parent.child")
    update_logger_level("parent.child", "error")
    info = logger_info("parent.child")
    assert info["configured"] == "error"
    assert info["effective"] == "error"
    parent.setLevel(logging.DEBUG)
    assert logger_info("parent.child")["effective"] == "error"


def test_list_includes_root(isolated_root_level: None) -> None:
    ids = [row["id"] for row in list_logger_levels()]
    assert "root" in ids
