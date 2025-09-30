from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional, Tuple, TYPE_CHECKING

import pandas as pd
import pandas_ta as ta

if TYPE_CHECKING:  # pragma: no cover
    from .candles import Candle


@dataclass
class IndicatorSnapshot:
    symbol: str
    timeframe: str
    timestamp: datetime
    close: float
    sma: Optional[float]
    rsi: Optional[float]
    bb_upper: Optional[float]
    bb_lower: Optional[float]

    def as_dict(self) -> dict[str, float | str | None]:
        return {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "timestamp": self.timestamp.isoformat(),
            "close": self.close,
            "sma": self.sma,
            "rsi": self.rsi,
            "bb_upper": self.bb_upper,
            "bb_lower": self.bb_lower,
        }


class IndicatorStore:
    """In-memory cache for latest indicator snapshots."""

    def __init__(self) -> None:
        self._cache: Dict[tuple[str, str], IndicatorSnapshot] = {}

    def set_snapshot(self, snapshot: IndicatorSnapshot) -> None:
        self._cache[(snapshot.symbol, snapshot.timeframe)] = snapshot

    def get_snapshot(self, symbol: str, timeframe: int | str) -> IndicatorSnapshot | None:
        tf_key = str(timeframe)
        return self._cache.get((symbol, tf_key))


class IndicatorEngine:
    def __init__(
        self,
        *,
        store: IndicatorStore,
        sma_period: int,
        rsi_period: int,
        bb_period: int,
        bb_sigma: float,
        max_rows: int = 1000,
    ) -> None:
        self._store = store
        self._sma_period = sma_period
        self._rsi_period = rsi_period
        self._bb_period = bb_period
        self._bb_sigma = bb_sigma
        self._max_rows = max_rows
        self._frames: Dict[Tuple[str, int], pd.DataFrame] = {}

    def handle_candle(self, symbol: str, timeframe: int, candle: 'Candle') -> IndicatorSnapshot | None:
        key = (symbol, timeframe)
        row = {
            "timestamp": candle.timestamp,
            "open": candle.open,
            "high": candle.high,
            "low": candle.low,
            "close": candle.close,
            "volume": candle.volume,
        }
        df = self._frames.get(key)
        if df is None:
            df = pd.DataFrame([row])
        else:
            df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
            if len(df) > self._max_rows:
                df = df.iloc[-self._max_rows :].reset_index(drop=True)
        self._frames[key] = df

        close_series = df["close"]
        sma_series = close_series.rolling(self._sma_period).mean()
        rsi_series = ta.rsi(close_series, length=self._rsi_period)
        bb_df = ta.bbands(close_series, length=self._bb_period, std=self._bb_sigma)

        snapshot = IndicatorSnapshot(
            symbol=symbol,
            timeframe=str(timeframe),
            timestamp=candle.timestamp,
            close=candle.close,
            sma=self._last_valid(sma_series),
            rsi=self._last_valid(rsi_series),
            bb_upper=self._last_valid(self._column_like(bb_df, "BBU")),
            bb_lower=self._last_valid(self._column_like(bb_df, "BBL")),
        )
        self._store.set_snapshot(snapshot)
        return snapshot

    @staticmethod
    def _last_valid(series: Optional[pd.Series]) -> Optional[float]:
        if series is None or series.empty:
            return None
        value = series.iloc[-1]
        if pd.isna(value):
            return None
        return float(value)

    @staticmethod
    def _column_like(df: Optional[pd.DataFrame], pattern: str) -> Optional[pd.Series]:
        if df is None or df.empty:
            return None
        cols = [col for col in df.columns if pattern in col]
        if not cols:
            return None
        return df[cols[0]]
