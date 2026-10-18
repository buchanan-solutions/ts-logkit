"""Tail query parsing and response shaping."""

from __future__ import annotations

import json
from typing import Any

from logkit.ring.buffer import RingBuffer

DEFAULT_TAIL_N = 100
MAX_TAIL_N = 500


def parse_tail_n(raw: str | None) -> int:
    if raw is None or raw == "":
        return DEFAULT_TAIL_N
    try:
        n = float(raw)
    except ValueError:
        return DEFAULT_TAIL_N
    if not (n >= 1 and n != float("inf")):
        return DEFAULT_TAIL_N
    return min(int(n), MAX_TAIL_N)


def filter_log_lines(lines: list[dict[str, Any]], q: str | None) -> list[dict[str, Any]]:
    needle = (q or "").strip().lower()
    if not needle:
        return lines
    out: list[dict[str, Any]] = []
    for line in lines:
        if needle in json.dumps(line, default=str).lower():
            out.append(line)
    return out


def get_log_tail(
    ring: RingBuffer[dict[str, Any]],
    n: int,
    q: str | None = None,
) -> dict[str, Any]:
    newest = ring.tail(n)
    body: dict[str, Any] = {
        "n": n,
        "capacity": ring.capacity,
        "size": ring.size,
        "lines": filter_log_lines(newest, q),
    }
    if q is not None and q != "":
        body["q"] = q
    return body
