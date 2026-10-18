from __future__ import annotations

import pytest


def test_rich_handler_factory() -> None:
    pytest.importorskip("rich")
    from logkit.stdlib.factories import create_rich_console_handler

    handler = create_rich_console_handler()
    assert handler.__class__.__name__ == "RichHandler"
