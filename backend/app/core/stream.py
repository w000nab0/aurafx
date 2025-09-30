from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from typing import Sequence

import websockets
from websockets.client import WebSocketClientProtocol

from ..services.broadcast import BroadcastHub
from ..services.rate_limiter import FX_PUBLIC_WS_LIMIT
from .candles import CandleAggregator, Candle
from .indicators import IndicatorEngine, IndicatorStore
from .signals import SignalEngine
from ..services.positions import PositionManager

logger = logging.getLogger(__name__)


def _parse_timestamp(value: str) -> datetime:
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def _format_timeframe(seconds: int) -> str:
    if seconds % 60 == 0:
        minutes = seconds // 60
        return f"{minutes}m"
    return f"{seconds}s"


class MarketStream:
    """Connects to GMOコイン WebSocket and publishes ticker, candle, and signal updates."""

    def __init__(
        self,
        *,
        endpoint: str,
        symbols: Sequence[str],
        broadcast: BroadcastHub,
        aggregator: CandleAggregator,
        indicator_engine: IndicatorEngine,
        indicator_store: IndicatorStore,
        signal_engine: SignalEngine,
        position_manager: PositionManager,
    ) -> None:
        self._endpoint = endpoint
        self._symbols = symbols
        self._broadcast = broadcast
        self._aggregator = aggregator
        self._indicator_engine = indicator_engine
        self._indicator_store = indicator_store
        self._signal_engine = signal_engine
        self._position_manager = position_manager
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
        # flush any remaining candles when stopping
        for symbol, timeframe, candle in self._aggregator.flush_open():
            await self._broadcast.publish(
                {
                    "type": "candle",
                    "data": self._candle_payload(symbol, timeframe, candle),
                }
            )

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
            await FX_PUBLIC_WS_LIMIT.acquire("ws-sub")
            await ws.send(payload)
            await asyncio.sleep(0.05)

    async def _listen(self, ws: WebSocketClientProtocol) -> None:
        async for message in ws:
            if self._stop_event.is_set():
                break
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                logger.debug("Non-JSON message: %s", message)
                continue

            symbol = data.get("symbol")
            if not symbol:
                continue
            await self._broadcast.publish({"type": "ticker", "data": data})

            price = self._extract_price(data)
            timestamp = _parse_timestamp(data["timestamp"])
            volume = float(data.get("volume", 0.0))

            position_event = self._position_manager.evaluate_price(symbol, price, timestamp)
            if position_event:
                await self._broadcast.publish(
                    {
                        "type": "position",
                        "data": position_event.as_dict(),
                    }
                )

            closed = self._aggregator.add_tick(symbol, price=price, volume=volume, ts=timestamp)
            for closed_symbol, timeframe, candle in closed:
                await self._broadcast.publish(
                    {
                        "type": "candle",
                        "data": self._candle_payload(closed_symbol, timeframe, candle),
                    }
                )
                snapshot = self._indicator_engine.handle_candle(closed_symbol, timeframe, candle)
                if snapshot is not None:
                    await self._broadcast.publish(
                        {
                            "type": "indicator",
                            "data": snapshot.as_dict(),
                        }
                    )

            for timeframe in self._aggregator.iter_timeframes():
                snapshot = self._indicator_store.get_snapshot(symbol, timeframe)
                if snapshot is None:
                    continue
                event = self._signal_engine.evaluate(
                    symbol=symbol,
                    timeframe=_format_timeframe(timeframe),
                    price=price,
                    indicator=snapshot,
                    timestamp=timestamp,
                )
                if event is not None:
                    await self._broadcast.publish({"type": "signal", "data": event.as_dict()})
                    if event.direction in {"BUY", "SELL"}:
                        pos_events = self._position_manager.handle_signal(symbol, event.direction, price, timestamp)
                        for pos_event in pos_events:
                            await self._broadcast.publish({"type": "position", "data": pos_event.as_dict()})

    @staticmethod
    def _extract_price(payload: dict) -> float:
        ask = payload.get("ask")
        bid = payload.get("bid")
        last = payload.get("last") or payload.get("price")

        def _to_float(value: object) -> float | None:
            try:
                return float(value)
            except (TypeError, ValueError):
                return None

        ask_v = _to_float(ask)
        bid_v = _to_float(bid)
        if ask_v is not None and bid_v is not None:
            return (ask_v + bid_v) / 2
        last_v = _to_float(last)
        if last_v is not None:
            return last_v
        if ask_v is not None:
            return ask_v
        if bid_v is not None:
            return bid_v
        raise ValueError("No price fields available in ticker payload")

    @staticmethod
    def _candle_payload(symbol: str, timeframe: int, candle: Candle) -> dict:
        payload = candle.as_dict()
        payload.update({
            "symbol": symbol,
            "timeframe": _format_timeframe(timeframe),
        })
        return payload
