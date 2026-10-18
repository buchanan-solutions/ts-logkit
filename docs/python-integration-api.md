# Python logkit integration API (frozen — phase 0)

Do not change without updating deploy `openspec/changes/logkit-and-ai-server` and cross-language fixtures.

## Lifecycle

```python
from logkit.ring import RingBuffer, RingHandler
from logkit.debug import debug_server

ring = RingBuffer(capacity=1000)
handler = RingHandler(ring)  # stdlib logging.Handler, level NOTSET
# Attach once to the application root logger after final dictConfig.

with debug_server(ring=ring, host="127.0.0.1", port=6060, mount="/api/logging") as listener:
    # listener.port is the bound port (supports port=0 in tests)
    ...
# Context exit stops listener/thread; application removes/closes the handler.
```

## Contracts

| Symbol | Behavior |
|--------|----------|
| `RingBuffer(capacity)` | Positive integer capacity; bounded chronological storage |
| `RingHandler(ring)` | Captures formatted records into the ring; must not break app logging |
| `debug_server(..., mount="/")` | Context manager; **no** listener on import |
| Bind errors | Propagate on enter (e.g. occupied port) |
| Context exit | Stop/join listener thread with bounded wait |
| `listener.port` | Actual bound port after bind |

HTTP served under `mount` must match [`debug-http-contract.md`](debug-http-contract.md) and [`fixtures/debug-contract/`](../fixtures/debug-contract/README.md).

Default library mount: `/`. AI Server integration target: `/api/logging`.
