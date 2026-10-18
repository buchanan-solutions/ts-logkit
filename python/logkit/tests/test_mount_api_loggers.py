from __future__ import annotations

import json
import urllib.request

from logkit.debug import debug_server
from logkit.ring import RingBuffer


def test_mount_api_loggers_list_path() -> None:
    ring: RingBuffer[dict] = RingBuffer(100)
    with debug_server(ring=ring, host="127.0.0.1", port=0, mount="/api/loggers") as listener:
        url = f"http://127.0.0.1:{listener.port}/api/loggers/loggers"
        with urllib.request.urlopen(url, timeout=5) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    assert resp.status == 200
    assert isinstance(body, list)
