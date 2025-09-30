from __future__ import annotations

import asyncio
from typing import Any, AsyncIterator


class BroadcastSubscription:
    def __init__(self) -> None:
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)

    def __aiter__(self) -> AsyncIterator[dict[str, Any]]:
        return self.iter_messages()

    async def iter_messages(self) -> AsyncIterator[dict[str, Any]]:
        while True:
            payload = await self.queue.get()
            yield payload


class BroadcastHub:
    """In-memory pub/sub for streaming messages to WebSocket clients."""

    def __init__(self) -> None:
        self._subscriptions: set[BroadcastSubscription] = set()
        self._lock = asyncio.Lock()

    async def publish(self, payload: dict[str, Any]) -> None:
        async with self._lock:
            for subscription in list(self._subscriptions):
                try:
                    subscription.queue.put_nowait(payload)
                except asyncio.QueueFull:
                    # Drop oldest message if subscriber lags behind
                    try:
                        subscription.queue.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                    subscription.queue.put_nowait(payload)

    def subscribe(self) -> BroadcastSubscription:
        subscription = BroadcastSubscription()
        self._subscriptions.add(subscription)
        return subscription

    async def unsubscribe(self, subscription: BroadcastSubscription) -> None:
        async with self._lock:
            self._subscriptions.discard(subscription)

    async def close(self) -> None:
        async with self._lock:
            self._subscriptions.clear()
