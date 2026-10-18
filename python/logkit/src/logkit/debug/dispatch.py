"""Mount-relative DEBUG HTTP dispatch (parity with dispatch.ts)."""

from __future__ import annotations

import json
from typing import Any, Callable
from urllib.parse import parse_qs

from logkit.debug.loggers import (
    list_logger_levels,
    logger_info,
    unset_logger_level,
    update_logger_level,
)
from logkit.debug.tail import get_log_tail, parse_tail_n
from logkit.debug.wire_levels import parse_level_body
from logkit.ring.buffer import RingBuffer

MAX_BODY_BYTES = 65536


def handle_debug_http_path(
    *,
    method: str,
    pathname: str,
    query: str,
    read_body: Callable[[], bytes],
    ring: RingBuffer[dict[str, Any]],
) -> tuple[int, object] | None:
    params = parse_qs(query, keep_blank_values=True)

    if method == "GET" and pathname in ("/health", "/healthz"):
        return 200, {"status": "ok"}

    if method == "GET" and pathname == "/tail":
        n_raw = params.get("n", [None])[0]
        q_raw = params.get("q", [None])[0]
        n = parse_tail_n(n_raw)
        return 200, get_log_tail(ring, n, q_raw)

    if method == "GET" and pathname == "/loggers":
        return 200, list_logger_levels()

    if pathname.startswith("/loggers/") and pathname != "/loggers/":
        wire_id = pathname[len("/loggers/") :]
        from urllib.parse import unquote

        wire_id = unquote(wire_id)
        if method == "GET":
            return 200, logger_info(wire_id)
        if method == "PUT":
            raw = read_body()
            if len(raw) > MAX_BODY_BYTES:
                return 400, {"error": "body must be valid JSON"}
            try:
                text = raw.decode("utf-8") if raw else ""
                body = json.loads(text) if text else None
            except (UnicodeDecodeError, json.JSONDecodeError):
                return 400, {"error": "body must be valid JSON"}
            level, err = parse_level_body(body)
            if err or not level:
                return 400, {"error": err or "invalid level"}
            return 200, update_logger_level(wire_id, level)
        if method == "DELETE":
            return 200, unset_logger_level(wire_id)

    return None
