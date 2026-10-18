from __future__ import annotations

import logging
import subprocess
import sys
import textwrap

import pytest
from logkit.ring import RingBuffer, RingHandler


def test_ring_capacity_validation() -> None:
    with pytest.raises(ValueError):
        RingBuffer(0)
    RingBuffer(1)


def test_ring_overflow_order() -> None:
    ring: RingBuffer[int] = RingBuffer(capacity=3)
    for i in range(5):
        ring.push(i)
    assert ring.size == 3
    assert ring.tail(10) == [2, 3, 4]


def test_ring_handler_capture_and_formatting() -> None:
    ring: RingBuffer[dict] = RingBuffer(capacity=10)
    handler = RingHandler(ring)
    log = logging.getLogger("app.fmt")
    log.addHandler(handler)
    try:
        log.warning("hello %s", "world")
    finally:
        log.removeHandler(handler)
        handler.close()

    lines = ring.tail(1)
    assert len(lines) == 1
    line = lines[0]
    assert line["logger_id"] == "app.fmt"
    assert line["level"] == "warn"
    assert line["message"] == "hello world"
    assert "ts" in line


def test_ring_handler_exception() -> None:
    ring: RingBuffer[dict] = RingBuffer(capacity=10)
    handler = RingHandler(ring)
    log = logging.getLogger("app.err")
    log.addHandler(handler)
    try:
        try:
            raise ValueError("boom")
        except ValueError:
            log.exception("failed")
    finally:
        log.removeHandler(handler)
        handler.close()

    line = ring.tail(1)[0]
    assert line["error"]["name"] == "ValueError"
    assert "boom" in line["error"]["message"]


def test_ring_snapshot_completes_and_returns_ordered_copy() -> None:
    # Run separately so a lock regression fails on timeout instead of hanging pytest.
    subprocess.run(
        [
            sys.executable,
            "-c",
            textwrap.dedent(
                """
                from logkit.ring import RingBuffer

                ring = RingBuffer(capacity=3)
                assert ring.snapshot() == []
                ring.push(0)
                ring.push(1)
                assert ring.snapshot() == [0, 1]
                for value in range(2, 5):
                    ring.push(value)
                snapshot = ring.snapshot()
                assert snapshot == [2, 3, 4]
                assert ring.tail(2) == [3, 4]
                snapshot.clear()
                assert ring.snapshot() == [2, 3, 4]
                """
            ),
        ],
        check=True,
        timeout=10,
    )
