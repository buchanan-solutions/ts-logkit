"""Fixed-capacity ring buffer for log lines."""

from __future__ import annotations

import threading
from typing import Generic, TypeVar

T = TypeVar("T")

DEFAULT_CAPACITY = 1000


class RingBuffer(Generic[T]):
    """Bounded FIFO ring; oldest entries drop when at capacity."""

    def __init__(self, capacity: int = DEFAULT_CAPACITY) -> None:
        if not isinstance(capacity, int) or isinstance(capacity, bool):
            raise TypeError("capacity must be a positive integer")
        if capacity < 1:
            raise ValueError("ring capacity must be >= 1")
        self._capacity = capacity
        self._buf: list[T | None] = [None] * capacity
        self._write = 0
        self._filled = 0
        self._lock = threading.Lock()

    @property
    def capacity(self) -> int:
        return self._capacity

    @property
    def size(self) -> int:
        with self._lock:
            return self._filled

    def push(self, item: T) -> None:
        with self._lock:
            self._buf[self._write] = item
            self._write = (self._write + 1) % self._capacity
            if self._filled < self._capacity:
                self._filled += 1

    def tail(self, n: int) -> list[T]:
        with self._lock:
            return self._tail_unlocked(n)

    def snapshot(self) -> list[T]:
        with self._lock:
            return self._tail_unlocked(self._filled)

    def _tail_unlocked(self, n: int) -> list[T]:
        """Copy the newest entries in order; caller must hold self._lock."""
        count = min(max(0, n), self._filled)
        if count == 0:
            return []
        out: list[T] = []
        start = (self._write - count + self._capacity) % self._capacity
        for i in range(count):
            entry = self._buf[(start + i) % self._capacity]
            if entry is not None:
                out.append(entry)
        return out
