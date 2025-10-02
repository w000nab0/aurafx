from __future__ import annotations

import logging
from typing import Awaitable, Callable, Optional

from ..core.signals import SignalEvent
from ..core.blackout import is_blackout
from .gmo_client import GMOClient
from .order_dispatcher import GMOOrderDispatcher, OrderDispatchSkip
from .positions import PositionEvent, PositionManager

logger = logging.getLogger(__name__)

class LiveTradingController:
    """Bridge between signal stream and GMOコイン実取引."""

    def __init__(
        self,
        *,
        client: Optional[GMOClient],
        position_manager: PositionManager,
        order_dispatcher: Optional[GMOOrderDispatcher] = None,
    ) -> None:
        self._client = client
        self._position_manager = position_manager
        self._dispatcher = order_dispatcher

    async def handle_signal(self, event: SignalEvent, price: float, spread: float | None) -> None:
        if self._client is None:
            return
        if not self._position_manager.is_trading_active():
            return
        if event.direction not in {"BUY", "SELL"}:
            return
        if event.trade_action not in {"OPEN", "REVERSE"}:
            return
        if is_blackout():
            logger.info(
                "Skipping market order for %s due to scheduled blackout window",
                event.symbol,
            )
            return
        if spread is not None and spread >= 0.5:
            logger.info(
                "Skipping market order for %s due to spread %.3f >= 0.5",
                event.symbol,
                spread,
            )
            return
        lot_size = self._position_manager.get_lot_size()
        side = event.direction
        logger.info("Queueing GMO market order: %s %s size=%s", side, event.symbol, lot_size)
        await self._enqueue_order(
            description=f"create_market_order {event.symbol}",
            factory=lambda: self._create_market_order(event.symbol, side, lot_size),
            on_failure_message=f"Failed to submit GMO order for {event.symbol}",
        )

    async def close_position(self, symbol: str, direction: str, size: float) -> None:
        if self._client is None:
            return
        side = "BUY" if direction == "SELL" else "SELL"
        await self._enqueue_order(
            description=f"manual_close {symbol}",
            factory=lambda: self._client.close_market_order(symbol=symbol, side=side, size=size),
            on_failure_message=f"Failed to close GMO position for {symbol}",
        )

    async def handle_position_event(self, event: PositionEvent) -> None:
        if self._client is None:
            return
        if event.event_type == "OPEN":
            return
        close_side = "BUY" if event.position.direction == "SELL" else "SELL"
        logger.info(
            "Queueing GMO close order: %s %s size=%s (event=%s)",
            close_side,
            event.position.symbol,
            event.position.lot_size,
            event.event_type,
        )
        await self._enqueue_order(
            description=f"close_market_order {event.position.symbol}",
            factory=lambda: self._client.close_market_order(
                symbol=event.position.symbol,
                side=close_side,
                size=event.position.lot_size,
            ),
            on_failure_message=f"Failed to submit GMO close order for {event.position.symbol}",
        )

    async def _create_market_order(self, symbol: str, side: str, size: float) -> object:
        if is_blackout():
            raise OrderDispatchSkip("blackout active")
        if not self._position_manager.is_trading_active():
            raise OrderDispatchSkip("trading inactive")
        return await self._client.create_market_order(symbol=symbol, side=side, size=size)

    async def _enqueue_order(
        self,
        *,
        description: str,
        factory: Callable[[], Awaitable[object]],
        on_failure_message: str,
    ) -> None:
        if self._dispatcher is None:
            logger.warning("Order dispatcher not configured; skipping %s", description)
            return
        try:
            await self._dispatcher.submit(factory, description=description)
        except Exception:
            logger.exception(on_failure_message)

__all__ = ["LiveTradingController"]
