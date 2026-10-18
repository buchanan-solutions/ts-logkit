"""Private stdlib HTTP debug listener."""

from __future__ import annotations

import json
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Iterator
from urllib.parse import urlparse

from logkit.debug.dispatch import handle_debug_http_path
from logkit.debug.mount import normalize_mount, pathname_under_mount
from logkit.ring.buffer import RingBuffer


@dataclass
class DebugListener:
    port: int


def _write_json(handler: BaseHTTPRequestHandler, status: int, body: object) -> None:
    payload = json.dumps(body).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


@contextmanager
def debug_server(
    *,
    ring: RingBuffer[dict[str, Any]],
    host: str = "127.0.0.1",
    port: int = 6060,
    mount: str = "/",
) -> Iterator[DebugListener]:
    normalized_mount = normalize_mount(mount)

    class _DebugHandler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, format: str, *args: object) -> None:  # noqa: A003
            return

        def _read_body(self) -> bytes:
            length = int(self.headers.get("Content-Length", "0") or "0")
            if length <= 0:
                return b""
            return self.rfile.read(length)

        def _dispatch(self) -> None:
            parsed = urlparse(self.path)
            relative = pathname_under_mount(parsed.path, normalized_mount)
            if relative is None:
                _write_json(self, 404, {"error": "not found"})
                return
            result = handle_debug_http_path(
                method=self.command,
                pathname=relative,
                query=parsed.query,
                read_body=self._read_body,
                ring=ring,
            )
            if result is None:
                _write_json(self, 404, {"error": "not found"})
                return
            status, body = result
            _write_json(self, status, body)

        def do_GET(self) -> None:  # noqa: N802
            try:
                self._dispatch()
            except Exception as err:
                _write_json(self, 500, {"error": str(err)})

        def do_PUT(self) -> None:  # noqa: N802
            try:
                self._dispatch()
            except Exception as err:
                _write_json(self, 500, {"error": str(err)})

        def do_DELETE(self) -> None:  # noqa: N802
            try:
                self._dispatch()
            except Exception as err:
                _write_json(self, 500, {"error": str(err)})

        def do_POST(self) -> None:  # noqa: N802
            _write_json(self, 404, {"error": "not found"})

    server = ThreadingHTTPServer((host, port), _DebugHandler)
    bound_port = int(server.server_address[1])
    thread = threading.Thread(target=server.serve_forever, name="logkit-debug-http", daemon=True)
    thread.start()
    listener = DebugListener(port=bound_port)
    try:
        yield listener
    finally:
        server.shutdown()
        thread.join(timeout=5.0)
        server.server_close()
