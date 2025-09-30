from __future__ import annotations

import asyncio
from collections import deque
from typing import Deque, Dict


class RateLimiter:
    """Simple token bucket limiter supporting per-key limits."""

    def __init__(self, limits: Dict[str, tuple[int, float]]) -> None:
        """limits: key -> (max_calls, interval_seconds)."""
        self._limits = limits
        self._events: Dict[str, Deque[float]] = {key: deque() for key in limits}
        self._lock = asyncio.Lock()

    async def acquire(self, key: str) -> None:
        if key not in self._limits:
            return
        max_calls, interval = self._limits[key]
        loop = asyncio.get_running_loop()
        async with self._lock:
            timestamps = self._events[key]
            now = loop.time()
            while timestamps and now - timestamps[0] > interval:
                timestamps.popleft()
            if len(timestamps) >= max_calls:
                wait_for = interval - (now - timestamps[0])
                await asyncio.sleep(max(0.0, wait_for))
                now = loop.time()
                while timestamps and now - timestamps[0] > interval:
                    timestamps.popleft()
            timestamps.append(loop.time())


# Default GMOコイン制限
FX_PUBLIC_WS_LIMIT = RateLimiter({"ws-sub": (1, 1.0)})
FX_PRIVATE_HTTP_LIMIT = RateLimiter({"GET": (6, 1.0), "POST": (1, 1.0)})
