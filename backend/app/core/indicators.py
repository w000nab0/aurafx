from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import isnan
from typing import Dict, Optional, Tuple, TYPE_CHECKING

import numpy as np
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
    sma: Dict[str, float]
    rsi: Dict[str, float]
    rci: Dict[str, float]
    bb: Dict[str, Dict[str, float]]
    trend: Dict[str, float | str]
    atr: Dict[str, float]

    def as_dict(self) -> dict[str, object]:
        return {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "timestamp": self.timestamp.isoformat(),
            "close": self.close,
            "sma": self._clean_dict(self.sma),
            "rsi": self._clean_dict(self.rsi),
            "rci": self._clean_dict(self.rci),
            "bb": {key: self._clean_dict(value) for key, value in self.bb.items()},
            "trend": self.trend,
            "atr": self._clean_dict(self.atr),
        }

    def get_bb(self, period: int, sigma: float) -> Tuple[Optional[float], Optional[float]]:
        key = f"{period}_{sigma}"
        info = self.bb.get(key)
        if info is None:
            return None, None
        return info.get("upper"), info.get("lower")

    @staticmethod
    def _clean_dict(data: Dict[str, float]) -> Dict[str, Optional[float]]:
        cleaned: Dict[str, Optional[float]] = {}
        for key, value in data.items():
            cleaned[key] = None if value is None or isnan(value) else value
        return cleaned


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
        sma_periods: list[int],
        rsi_periods: list[int],
        rci_periods: list[int],
        bb_period: int,
        bb_sigmas: list[float],
        trend_window: int,
        trend_threshold_pips: float,
        pip_size: float,
        max_rows: int = 1000,
        trend_sma_period: int = 21,
        atr_periods: list[int] = None,
    ) -> None:
        self._store = store
        self._sma_periods = sma_periods
        self._rsi_periods = rsi_periods
        self._rci_periods = rci_periods
        self._bb_period = bb_period
        self._bb_sigmas = bb_sigmas
        self._trend_window = trend_window
        self._trend_threshold_pips = trend_threshold_pips
        self._pip_size = pip_size
        self._max_rows = max_rows
        self._trend_sma_period = trend_sma_period
        self._atr_periods = atr_periods or [14]
        self._frames: Dict[Tuple[str, int], pd.DataFrame] = {}

    def set_trend_sma_period(self, period: int) -> None:
        if period <= 0:
            raise ValueError("trend_sma_period must be positive")
        self._trend_sma_period = period

    def get_trend_sma_period(self) -> int:
        return self._trend_sma_period

    def set_trend_threshold(self, threshold: float) -> None:
        if threshold <= 0:
            raise ValueError("trend_threshold_pips must be positive")
        self._trend_threshold_pips = threshold

    def get_trend_threshold(self) -> float:
        return self._trend_threshold_pips

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
        sma_values: Dict[str, float] = {}
        for period in self._sma_periods:
            value = close_series.rolling(period).mean().iloc[-1] if len(close_series) >= period else np.nan
            if not np.isnan(value):
                sma_values[str(period)] = float(value)

        rsi_values: Dict[str, float] = {}
        for period in self._rsi_periods:
            series = ta.rsi(close_series, length=period)
            if series is None or series.empty:
                continue
            value = series.iloc[-1]
            if not pd.isna(value):
                rsi_values[str(period)] = float(value)

        rci_values: Dict[str, float] = {}
        for period in self._rci_periods:
            value = self._compute_rci(close_series, period)
            if value is not None:
                rci_values[str(period)] = value

        bb_values: Dict[str, Dict[str, float]] = {}
        for sigma in self._bb_sigmas:
            bb_df = ta.bbands(close_series, length=self._bb_period, std=sigma)
            if bb_df is None or bb_df.empty:
                continue
            lower = self._last_valid(self._column_like(bb_df, "BBL"))
            mid = self._last_valid(self._column_like(bb_df, "BBM"))
            upper = self._last_valid(self._column_like(bb_df, "BBU"))
            key_name = f"{self._bb_period}_{sigma}"
            bb_values[key_name] = {
                "lower": lower,
                "mid": mid,
                "upper": upper,
            }

        atr_values: Dict[str, float] = {}
        for period in self._atr_periods:
            atr_series = ta.atr(df["high"], df["low"], df["close"], length=period)
            if atr_series is None or atr_series.empty:
                continue
            value = atr_series.iloc[-1]
            if not pd.isna(value):
                atr_values[str(period)] = float(value)

        trend = self._compute_trend(close_series)

        snapshot = IndicatorSnapshot(
            symbol=symbol,
            timeframe=str(timeframe),
            timestamp=candle.timestamp,
            close=candle.close,
            sma=sma_values,
            rsi=rsi_values,
            rci=rci_values,
            bb=bb_values,
            trend=trend,
            atr=atr_values,
        )
        self._store.set_snapshot(snapshot)
        return snapshot

    def get_snapshot(self, symbol: str, timeframe: int | str) -> IndicatorSnapshot | None:
        return self._store.get_snapshot(symbol, timeframe)

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

    def _compute_trend(self, close_series: pd.Series) -> Dict[str, float | str]:
        direction = "flat"
        slope = float("nan")
        slope_pips = float("nan")
        ready = False
        if len(close_series) >= self._trend_sma_period and self._pip_size > 0:
            sma_series = close_series.rolling(self._trend_sma_period).mean()
            sma_recent = sma_series.dropna()
            if len(sma_recent) >= self._trend_window:
                recent = sma_recent.iloc[-self._trend_window :].to_numpy(dtype=float)
                if len(recent) >= 2:
                    x = np.arange(len(recent))
                    coeffs = np.polyfit(x, recent, 1)
                    slope = float(coeffs[0])
                    slope_pips = slope / self._pip_size
                    if slope_pips > self._trend_threshold_pips:
                        direction = "up"
                    elif slope_pips < -self._trend_threshold_pips:
                        direction = "down"
                    ready = True
        return {
            "method": "regression",
            "window": self._trend_window,
            "slope": None if isnan(slope) else slope,
            "slope_pips": None if isnan(slope_pips) else slope_pips,
            "direction": direction,
            "ready": ready,
        }

    def _compute_rci(self, series: pd.Series, length: int) -> Optional[float]:
        if len(series) < length:
            return None
        window = series.iloc[-length:]
        rank = window.rank(method="min")
        time_order = pd.Series(range(1, length + 1), index=window.index, dtype=float)
        diff = rank - time_order
        summation = (diff ** 2).sum()
        rci = (1 - (6 * summation) / (length * (length ** 2 - 1))) * 100
        if pd.isna(rci):
            return None
        return float(rci)
