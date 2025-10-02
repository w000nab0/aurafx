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
    strategy: str

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
    pips: float

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
            "pips": self.pips,
            "strategy": self.position.strategy,
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
        trading_active: bool = False,
    ) -> None:
        self._pip_size = pip_size
        self._lot_size = lot_size
        self._stop_loss_pips = stop_loss_pips
        self._take_profit_pips = take_profit_pips
        self._fee_rate = fee_rate
        self._positions: Dict[tuple[str, str], Position] = {}
        self._last_price: Dict[str, float] = {}
        self._trading_active = trading_active

    def get_positions(self) -> List[Position]:
        return list(self._positions.values())

    def serialize_positions(self) -> List[dict[str, object]]:
        data: List[dict[str, object]] = []
        for (symbol, strategy), position in self._positions.items():
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
                    "strategy": strategy,
                }
            )
        return data

    def get_config(self) -> dict[str, float | bool]:
        return {
            "pip_size": self._pip_size,
            "lot_size": self._lot_size,
            "stop_loss_pips": self._stop_loss_pips,
            "take_profit_pips": self._take_profit_pips,
            "fee_rate": self._fee_rate,
            "trading_active": self._trading_active,
        }

    def update_config(
        self,
        *,
        pip_size: Optional[float] = None,
        lot_size: Optional[float] = None,
        stop_loss_pips: Optional[float] = None,
        take_profit_pips: Optional[float] = None,
        fee_rate: Optional[float] = None,
        trading_active: Optional[bool] = None,
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
        if trading_active is not None:
            self._trading_active = trading_active

    def handle_signal(self, symbol: str, direction: str, price: float, timestamp: datetime, *, strategy: str | None = None) -> List[PositionEvent]:
        key = (symbol, strategy or "default")
        existing = self._positions.get(key)
        self._last_price[symbol] = price
        events: List[PositionEvent] = []
        if not self._trading_active:
            return events

        if direction in {"BUY", "SELL"}:
            if existing and existing.direction == direction:
                return events
            if existing:
                return events
            self._positions[key] = self._create_position(
                symbol, direction, price, timestamp, strategy=strategy or "default"
            )
            open_event = PositionEvent(
                event_type="OPEN",
                position=self._positions[key],
                price=price,
                timestamp=timestamp,
                pnl=-self._positions[key].open_fee,
                fee_paid=self._positions[key].open_fee,
                pips=0.0,
            )
            events.append(open_event)
        return events

    def evaluate_price(self, symbol: str, price: float, timestamp: datetime) -> Optional[PositionEvent]:
        triggered = None
        for key, position in list(self._positions.items()):
            sym_key, _ = key
            if sym_key != symbol:
                continue
            self._last_price[symbol] = price
            if position.direction == "BUY":
                if price <= position.stop_loss:
                    triggered = self._close_position_by_key(key, price, timestamp, reason="STOP_LOSS")
                elif price >= position.take_profit:
                    triggered = self._close_position_by_key(key, price, timestamp, reason="TAKE_PROFIT")
            else:
                if price >= position.stop_loss:
                    triggered = self._close_position_by_key(key, price, timestamp, reason="STOP_LOSS")
                elif price <= position.take_profit:
                    triggered = self._close_position_by_key(key, price, timestamp, reason="TAKE_PROFIT")
            if triggered:
                break
        return triggered

    def close_position(self, symbol: str, price: float, timestamp: datetime, reason: str = "MANUAL_CLOSE") -> Optional[PositionEvent]:
        for key, position in list(self._positions.items()):
            sym_key, _ = key
            if sym_key != symbol:
                continue
            return self._close_position_by_key(key, price, timestamp, reason=reason)
        return None

    def get_last_price(self, symbol: str) -> float:
        default = 0.0
        for (sym_key, _), position in self._positions.items():
            if sym_key == symbol:
                default = position.entry_price
                break
        return self._last_price.get(symbol, default)

    def get_lot_size(self) -> float:
        return self._lot_size

    def _close_position_by_key(self, key: tuple[str, str], price: float, timestamp: datetime, reason: str) -> Optional[PositionEvent]:
        position = self._positions.pop(key, None)
        if not position:
            return None
        pnl_before_fee = position.unrealized(price)
        close_fee = price * position.lot_size * position.fee_rate
        pnl = pnl_before_fee - close_fee
        direction_sign = 1 if position.direction == "BUY" else -1
        pips = (price - position.entry_price) * direction_sign / self._pip_size
        self._last_price[position.symbol] = price
        return PositionEvent(
            event_type=reason,
            position=position,
            price=price,
            timestamp=timestamp,
            pnl=pnl,
            fee_paid=close_fee,
            pips=pips,
        )

    def _create_position(
        self,
        symbol: str,
        direction: str,
        price: float,
        timestamp: datetime,
        *,
        strategy: str,
    ) -> Position:
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
            strategy=strategy,
        )

    def set_trading_active(self, active: bool) -> None:
        self._trading_active = active

    def is_trading_active(self) -> bool:
        return self._trading_active
