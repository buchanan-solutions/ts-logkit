from __future__ import annotations

import json
import logging
import socket
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from logkit.debug import debug_server
from logkit.ring import RingBuffer, RingHandler

FIXTURES = Path(__file__).resolve().parents[3] / "fixtures" / "debug-contract"


def _url(host: str, port: int, path: str) -> str:
    return f"http://{host}:{port}{path}"


def _request(method: str, url: str, body: object | str | None = None) -> tuple[int, object]:
    data: bytes | None = None
    headers: dict[str, str] = {}
    if body is not None:
        if isinstance(body, str):
            data = body.encode("utf-8")
        else:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8")
        return err.code, json.loads(raw) if raw else None


@pytest.fixture
def debug_stack(isolated_root_level: None):
    ring: RingBuffer[dict] = RingBuffer(capacity=1000)
    handler = RingHandler(ring)
    logging.root.addHandler(handler)
    try:
        with debug_server(ring=ring, host="127.0.0.1", port=0, mount="/api/logging") as listener:
            yield ring, listener.port
    finally:
        logging.root.removeHandler(handler)
        handler.close()


def test_health_and_mount_boundary(debug_stack) -> None:
    _, port = debug_stack
    status, body = _request("GET", _url("127.0.0.1", port, "/api/logging/health"))
    assert status == 200
    assert body == {"status": "ok"}
    status, body = _request("GET", _url("127.0.0.1", port, "/api/logging-other/tail"))
    assert status == 404
    assert body == {"error": "not found"}


def test_fixture_cases(debug_stack) -> None:
    _, port = debug_stack
    skip_shape_only = {
        "loggers-list-200.json",
        "logger-get-notset-200.json",
        "logger-delete-unset-200.json",
        "mount-api-loggers-list-path.json",
    }
    for path in sorted(FIXTURES.glob("*.json")):
        if path.name in skip_shape_only:
            continue
        case = json.loads(path.read_text())
        mount = case.get("mount", "/")
        req = case["request"]
        full_path = req["path"]
        if mount != "/" and full_path.startswith(mount):
            rel = full_path
        else:
            rel = full_path
        method = req["method"]
        body = req.get("body")
        with debug_server(ring=RingBuffer(1000), host="127.0.0.1", port=0, mount=mount) as nested:
            nested_port = nested.port
            status, resp_body = _request(
                method,
                _url("127.0.0.1", nested_port, rel),
                body,
            )
        expected = case["response"]
        assert status == expected["status"], path.name
        assert resp_body == expected["body"], path.name


def test_port_zero_and_rebind() -> None:
    ring: RingBuffer[dict] = RingBuffer(10)
    with debug_server(ring=ring, host="127.0.0.1", port=0, mount="/") as first:
        assert first.port > 0
    with debug_server(ring=ring, host="127.0.0.1", port=0, mount="/") as second:
        assert second.port > 0


def test_occupied_port_raises() -> None:
    ring: RingBuffer[dict] = RingBuffer(10)
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    try:
        with pytest.raises(OSError):
            with debug_server(ring=ring, host="127.0.0.1", port=port, mount="/"):
                pass
    finally:
        sock.close()


def test_tail_query_filter(debug_stack) -> None:
    ring, port = debug_stack
    log = logging.getLogger("server")
    log.info("hello server")
    log.info("other")
    status, body = _request("GET", _url("127.0.0.1", port, "/api/logging/tail?n=50&q=server"))
    assert status == 200
    assert body["q"] == "server"
    assert body["size"] >= 2
    assert all("server" in json.dumps(line).lower() for line in body["lines"])
