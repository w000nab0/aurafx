from __future__ import annotations

import asyncio
import json
import logging
from typing import Sequence

import websockets
from websockets.client import WebSocketClientProtocol

from ..services.broadcast import BroadcastHub

logger = logging.getLogger(__name__)


class MarketStream:
    """Connects to GMOコイン WebSocket and publishes ticker updates."""

    def __init__(
        self,
        *,
        endpoint: str,
        symbols: Sequence[str],
        broadcast: BroadcastHub,
    ) -> None:
        self._endpoint = endpoint
        self._symbols = symbols
        self._broadcast = broadcast
        self._stop_event = asyncio.Event()

    def stop(self) -> None:
        self._stop_event.set()

    async def run(self) -> None:
        while not self._stop_event.is_set():
            try:
                await self._run_once()
            except Exception as exc:  # pragma: no cover - network resilience
                logger.exception("Market stream error: %s", exc)
                await asyncio.sleep(5)

    async def _run_once(self) -> None:
        subscribe_payloads = [
            json.dumps({"command": "subscribe", "channel": "ticker", "symbol": symbol})
            for symbol in self._symbols
        ]

        async with websockets.connect(self._endpoint, ping_interval=20) as ws:
            await self._subscribe_all(ws, subscribe_payloads)
            logger.info("Subscribed to %s symbols", len(subscribe_payloads))
            await self._listen(ws)

    async def _subscribe_all(
        self,
        ws: WebSocketClientProtocol,
        payloads: list[str],
    ) -> None:
        for payload in payloads:
            await ws.send(payload)
            await asyncio.sleep(0.05)  # avoid hitting rate limits

    async def _listen(self, ws: WebSocketClientProtocol) -> None:
        async for message in ws:
            if self._stop_event.is_set():
                break
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                logger.debug("Non-JSON message: %s", message)
                continue
            await self._broadcast.publish({"type": "ticker", "data": data})
