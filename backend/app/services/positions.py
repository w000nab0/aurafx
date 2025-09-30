from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class Position:
    symbol: str
    direction: str  # BUY or SELL
    entry_price: float
    lot_size: float
    stop_loss: float
    take_profit: float
    opened_at: datetime
    fee_rate: float
    open_fee: float

    def unrealized(self, price: float) -> float:
        sign = 1 if self.direction == "BUY" else -1
        return (price - self.entry_price) * self.lot_size * sign


@dataclass
class PositionEvent:
    event_type: str  # OPEN, CLOSE, TAKE_PROFIT, STOP_LOSS, MANUAL_CLOSE
    position: Position
    price: float
    timestamp: datetime
    pnl: float
    fee_paid: float

    def as_dict(self) -> dict[str, object]:
        return {
            "type": self.event_type,
            "symbol": self.position.symbol,
            "direction": self.position.direction,
            "entry_price": self.position.entry_price,
            "lot_size": self.position.lot_size,
            "stop_loss": self.position.stop_loss,
            "take_profit": self.position.take_profit,
            "opened_at": self.position.opened_at.isoformat(),
            "price": self.price,
            "timestamp": self.timestamp.isoformat(),
            "pnl": self.pnl,
            "fee_paid": self.fee_paid,
        }


class PositionManager:
    def __init__(
        self,
        *,
        pip_size: float,
        lot_size: float,
        stop_loss_pips: float,
        take_profit_pips: float,
        fee_rate: float,
    ) -> None:
        self._pip_size = pip_size
        self._lot_size = lot_size
        self._stop_loss_pips = stop_loss_pips
        self._take_profit_pips = take_profit_pips
        self._fee_rate = fee_rate
        self._positions: Dict[str, Position] = {}
        self._last_price: Dict[str, float] = {}

    def get_positions(self) -> List[Position]:
        return list(self._positions.values())

    def serialize_positions(self) -> List[dict[str, object]]:
        data: List[dict[str, object]] = []
        for symbol, position in self._positions.items():
            price = self.get_last_price(symbol)
            data.append(
                {
                    "symbol": symbol,
                    "direction": position.direction,
                    "entry_price": position.entry_price,
                    "lot_size": position.lot_size,
                    "stop_loss": position.stop_loss,
                    "take_profit": position.take_profit,
                    "opened_at": position.opened_at.isoformat(),
                    "unrealized_pnl": position.unrealized(price) - position.open_fee,
                    "last_price": price,
                    "open_fee": position.open_fee,
                    "fee_rate": position.fee_rate,
                }
            )
        return data

    def get_config(self) -> dict[str, float]:
        return {
            "pip_size": self._pip_size,
            "lot_size": self._lot_size,
            "stop_loss_pips": self._stop_loss_pips,
            "take_profit_pips": self._take_profit_pips,
            "fee_rate": self._fee_rate,
        }

    def update_config(
        self,
        *,
        pip_size: Optional[float] = None,
        lot_size: Optional[float] = None,
        stop_loss_pips: Optional[float] = None,
        take_profit_pips: Optional[float] = None,
        fee_rate: Optional[float] = None,
    ) -> None:
        if pip_size is not None:
            self._pip_size = pip_size
        if lot_size is not None:
            self._lot_size = lot_size
        if stop_loss_pips is not None:
            self._stop_loss_pips = stop_loss_pips
        if take_profit_pips is not None:
            self._take_profit_pips = take_profit_pips
        if fee_rate is not None:
            self._fee_rate = fee_rate

    def handle_signal(self, symbol: str, direction: str, price: float, timestamp: datetime) -> List[PositionEvent]:
        existing = self._positions.get(symbol)
        self._last_price[symbol] = price
        events: List[PositionEvent] = []
        if direction in {"BUY", "SELL"}:
            if existing and existing.direction == direction:
                return events
            if existing:
                close_event = self._close_position(symbol, price, timestamp, reason="REVERSE")
                if close_event:
                    events.append(close_event)
            self._positions[symbol] = self._create_position(symbol, direction, price, timestamp)
            open_event = PositionEvent(
                event_type="OPEN",
                position=self._positions[symbol],
                price=price,
                timestamp=timestamp,
                pnl=-self._positions[symbol].open_fee,
                fee_paid=self._positions[symbol].open_fee,
            )
            events.append(open_event)
        return events

    def evaluate_price(self, symbol: str, price: float, timestamp: datetime) -> Optional[PositionEvent]:
        position = self._positions.get(symbol)
        if not position:
            return None
        self._last_price[symbol] = price
        if position.direction == "BUY":
            if price <= position.stop_loss:
                return self._close_position(symbol, price, timestamp, reason="STOP_LOSS")
            if price >= position.take_profit:
                return self._close_position(symbol, price, timestamp, reason="TAKE_PROFIT")
        else:
            if price >= position.stop_loss:
                return self._close_position(symbol, price, timestamp, reason="STOP_LOSS")
            if price <= position.take_profit:
                return self._close_position(symbol, price, timestamp, reason="TAKE_PROFIT")
        return None

    def close_position(self, symbol: str, price: float, timestamp: datetime, reason: str = "MANUAL_CLOSE") -> Optional[PositionEvent]:
        return self._close_position(symbol, price, timestamp, reason=reason)

    def get_last_price(self, symbol: str) -> float:
        position = self._positions.get(symbol)
        default = position.entry_price if position else 0.0
        return self._last_price.get(symbol, default)

    def _close_position(self, symbol: str, price: float, timestamp: datetime, reason: str) -> Optional[PositionEvent]:
        position = self._positions.pop(symbol, None)
        if not position:
            return None
        pnl_before_fee = position.unrealized(price)
        close_fee = price * position.lot_size * position.fee_rate
        pnl = pnl_before_fee - close_fee
        self._last_price[symbol] = price
        return PositionEvent(
            event_type=reason,
            position=position,
            price=price,
            timestamp=timestamp,
            pnl=pnl,
            fee_paid=close_fee,
        )

    def _create_position(self, symbol: str, direction: str, price: float, timestamp: datetime) -> Position:
        offset = self._pip_size
        stop_loss_price = price - self._stop_loss_pips * offset if direction == "BUY" else price + self._stop_loss_pips * offset
        take_profit_price = price + self._take_profit_pips * offset if direction == "BUY" else price - self._take_profit_pips * offset
        notional = price * self._lot_size
        open_fee = notional * self._fee_rate
        return Position(
            symbol=symbol,
            direction=direction,
            entry_price=price,
            lot_size=self._lot_size,
            stop_loss=stop_loss_price,
            take_profit=take_profit_price,
            opened_at=timestamp,
            fee_rate=self._fee_rate,
            open_fee=open_fee,
        )
