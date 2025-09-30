from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque, Dict, Iterable, List, Sequence, Tuple


@dataclass
class Candle:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

    def as_dict(self) -> dict[str, float | str]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
        }


def _floor_timestamp(ts: datetime, seconds: int) -> datetime:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    epoch = int(ts.timestamp())
    floored_epoch = (epoch // seconds) * seconds
    return datetime.fromtimestamp(floored_epoch, tz=ts.tzinfo)


class CandleAggregator:
    """Aggregates tick data into OHLC candles for configured timeframes."""

    def __init__(self, timeframes: Sequence[int], history_limit: int = 500) -> None:
        if not timeframes:
            raise ValueError("timeframes must not be empty")
        self._timeframes = tuple(sorted(timeframes))
        self._history_limit = history_limit
        self._builders: Dict[tuple[str, int], Candle] = {}
        self._candles: Dict[tuple[str, int], Deque[Candle]] = {}

    def add_tick(
        self,
        symbol: str,
        price: float,
        volume: float,
        ts: datetime,
    ) -> List[Tuple[str, int, Candle]]:
        closed: List[Tuple[str, int, Candle]] = []
        for timeframe in self._timeframes:
            key = (symbol, timeframe)
            bucket_start = _floor_timestamp(ts, timeframe)
            builder = self._builders.get(key)

            if builder is None:
                self._builders[key] = self._create_builder(bucket_start, price, volume)
                continue

            if builder.timestamp != bucket_start:
                closed.append((symbol, timeframe, builder))
                self._append_candle(key, builder)
                builder = self._create_builder(bucket_start, price, volume)
                self._builders[key] = builder
            else:
                builder.high = max(builder.high, price)
                builder.low = min(builder.low, price)
                builder.close = price
                builder.volume += volume

        return closed

    def flush_open(self) -> List[Tuple[str, int, Candle]]:
        flushed: List[Tuple[str, int, Candle]] = []
        for key, candle in list(self._builders.items()):
            flushed.append((key[0], key[1], candle))
            self._append_candle(key, candle)
        self._builders.clear()
        return flushed

    def get_candles(self, symbol: str, timeframe: int) -> List[Candle]:
        return list(self._candles.get((symbol, timeframe), []))

    def iter_timeframes(self) -> Iterable[int]:
        return iter(self._timeframes)

    def _append_candle(self, key: tuple[str, int], candle: Candle) -> None:
        history = self._candles.setdefault(key, deque(maxlen=self._history_limit))
        history.append(candle)

    @staticmethod
    def _create_builder(start: datetime, price: float, volume: float) -> Candle:
        return Candle(
            timestamp=start,
            open=price,
            high=price,
            low=price,
            close=price,
            volume=volume,
        )
