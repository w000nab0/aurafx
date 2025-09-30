from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional, Tuple

from .indicators import IndicatorSnapshot


@dataclass
class SignalEvent:
    symbol: str
    timeframe: str
    direction: str  # "BUY" or "SELL"
    price: float
    occurred_at: datetime
    indicators: IndicatorSnapshot

    def as_dict(self) -> dict[str, object]:
        data = {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "direction": self.direction,
            "price": self.price,
            "occurred_at": self.occurred_at.isoformat(),
        }
        data.update(
            {
                "indicator_timestamp": self.indicators.timestamp.isoformat(),
                "sma": self.indicators.sma,
                "rsi": self.indicators.rsi,
                "rci": self.indicators.rci,
                "bb": self.indicators.bb,
                "trend": self.indicators.trend,
            }
        )
        return data


class SignalEngine:
    """Evaluates tick data against indicator snapshots to emit trading signals."""

    def __init__(self, cooldown_seconds: int = 30, bb_period: int = 21, bb_sigma: float = 2.0) -> None:
        self.cooldown_seconds = cooldown_seconds
        self._bb_period = bb_period
        self._bb_sigma = bb_sigma
        self._last_signal: Dict[Tuple[str, str, str], datetime] = {}
        self._last_indicator_timestamp: Dict[Tuple[str, str, str], datetime] = {}

    def evaluate(
        self,
        *,
        symbol: str,
        timeframe: str,
        price: float,
        indicator: IndicatorSnapshot,
        timestamp: datetime,
    ) -> Optional[SignalEvent]:
        upper, lower = indicator.get_bb(self._bb_period, self._bb_sigma)
        if upper is None or lower is None:
            return None

        direction: Optional[str] = None
        if price >= upper:
            direction = "SELL"
        elif price <= lower:
            direction = "BUY"

        if direction is None:
            return None

        key = (symbol, timeframe, direction)
        last_indicator_ts = self._last_indicator_timestamp.get(key)
        if last_indicator_ts == indicator.timestamp:
            return None

        last_time = self._last_signal.get(key)
        if last_time is not None:
            delta = (timestamp - last_time).total_seconds()
            if delta < self.cooldown_seconds:
                return None

        event = SignalEvent(
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            price=price,
            occurred_at=timestamp,
            indicators=indicator,
        )
        self._last_signal[key] = timestamp
        self._last_indicator_timestamp[key] = indicator.timestamp
        return event
