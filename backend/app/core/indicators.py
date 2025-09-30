from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict


@dataclass
class IndicatorSnapshot:
    symbol: str
    timeframe: str
    timestamp: datetime
    sma: float | None
    rsi: float | None
    bb_upper: float | None
    bb_lower: float | None


class IndicatorStore:
    """Holds the most recent indicator snapshot for each symbol/timeframe."""

    def __init__(self) -> None:
        self._cache: Dict[tuple[str, str], IndicatorSnapshot] = {}

    def set_snapshot(self, snapshot: IndicatorSnapshot) -> None:
        self._cache[(snapshot.symbol, snapshot.timeframe)] = snapshot

    def get_snapshot(self, symbol: str, timeframe: str) -> IndicatorSnapshot | None:
        return self._cache.get((symbol, timeframe))
