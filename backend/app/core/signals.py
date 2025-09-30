from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from .indicators import IndicatorSnapshot


@dataclass
class SignalEvent:
    symbol: str
    timeframe: str
    direction: str  # "BUY" or "SELL"
    price: float
    occurred_at: datetime
    indicators: IndicatorSnapshot


class SignalEngine:
    """Evaluates tick data against indicator snapshots to emit trading signals."""

    def __init__(self, cooldown_seconds: int = 30) -> None:
        self.cooldown_seconds = cooldown_seconds
        self._last_signal: dict[tuple[str, str], datetime] = {}

    def evaluate(
        self,
        *,
        symbol: str,
        timeframe: str,
        price: float,
        indicator: IndicatorSnapshot,
        timestamp: datetime,
    ) -> Optional[SignalEvent]:
        # TODO: implement Bollinger-band mean reversion logic
        return None
