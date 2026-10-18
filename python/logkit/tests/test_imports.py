from __future__ import annotations


def test_root_import_without_rich() -> None:
    import logkit  # noqa: F401
    import logkit.stdlib  # noqa: F401
    from logkit.ring import RingBuffer, RingHandler  # noqa: F401
    from logkit.debug import debug_server  # noqa: F401


def test_colored_handler_without_rich() -> None:
    from logkit.stdlib.factories import create_colored_level_handler

    handler = create_colored_level_handler()
    assert handler.__class__.__name__ == "StreamHandler"
