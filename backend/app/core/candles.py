from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List


@dataclass
class Candle:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class CandleAggregator:
    """Aggregates tick data into OHLC candles for the configured timeframe."""

    def __init__(self) -> None:
        self._candles: Dict[str, List[Candle]] = {}

    def add_tick(self, symbol: str, price: float, volume: float, ts: datetime) -> None:
        # TODO: implement OHLC aggregation logic
        raise NotImplementedError

    def get_candles(self, symbol: str) -> List[Candle]:
        return self._candles.get(symbol, [])
