from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Callable, Deque, Dict, Iterable, Optional, Sequence, Tuple

from .blackout import is_blackout
from .candles import Candle
from .indicators import IndicatorSnapshot, IndicatorStore


class Strategy(str, Enum):
    BB_MEAN_REVERSION_1M = "bb_mean_reversion_1m"
    MA_TOUCH_BOUNCE_1M = "ma_touch_bounce_1m"
    MA_TOUCH_BOUNCE_5M = "ma_touch_bounce_5m"
    FAKE_BREAKOUT_1M = "fake_breakout_1m"
    MA_CROSS_TREND_1M = "ma_cross_trend_1m"
    TREND_PULLBACK_1M = "trend_pullback_1m"
    POSITION_CLOSE = "position_close"


STRATEGY_LABELS: dict[Strategy, str] = {
    Strategy.BB_MEAN_REVERSION_1M: "BB逆張り (1分)",
    Strategy.MA_TOUCH_BOUNCE_1M: "SMA21タッチ反発 (1分)",
    Strategy.MA_TOUCH_BOUNCE_5M: "SMA21タッチ反発 (5分)",
    Strategy.FAKE_BREAKOUT_1M: "高値・安値フェイクブレイク (1分)",
    Strategy.MA_CROSS_TREND_1M: "移動平均クロス順張り (1分)",
    Strategy.TREND_PULLBACK_1M: "トレンド押し目・戻り目 (1分)",
    Strategy.POSITION_CLOSE: "ポジション決済",
}


TIMEFRAME_SECONDS: dict[str, int] = {
    "1m": 60,
    "5m": 300,
}


@dataclass
class SignalEvent:
    symbol: str
    timeframe: str
    direction: str  # "BUY" or "SELL"
    price: float
    occurred_at: datetime
    indicators: IndicatorSnapshot
    strategy: Strategy
    trade_action: str = "NONE"
    pnl: float | None = None
    pips: float | None = None

    def as_dict(self) -> dict[str, object]:
        data = {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "direction": self.direction,
            "price": self.price,
            "occurred_at": self.occurred_at.isoformat(),
            "strategy": self.strategy.value,
            "strategy_name": STRATEGY_LABELS[self.strategy],
            "trade_action": self.trade_action,
        }
        data.update(
            {
                "indicator_timestamp": self.indicators.timestamp.isoformat(),
                "close": self.indicators.close,
                "sma": self.indicators.sma,
                "rsi": self.indicators.rsi,
                "rci": self.indicators.rci,
                "bb": self.indicators.bb,
                "trend": self.indicators.trend,
            }
        )
        if self.pnl is not None:
            data["pnl"] = self.pnl
        if self.pips is not None:
            data["pips"] = self.pips
        return data


@dataclass
class StrategyContext:
    symbol: str
    timeframe: str
    timeframe_seconds: int
    price: float
    indicator: IndicatorSnapshot
    timestamp: datetime
    candles: Sequence[Candle]
    get_other_snapshot: Callable[[int], Optional[IndicatorSnapshot]]
    previous_snapshot: Optional[IndicatorSnapshot]
    pip_size: float


class SignalEngine:
    """Evaluates indicator snapshots to emit trading signals across multiple strategies."""

    def __init__(
        self,
        *,
        store: IndicatorStore,
        pip_size: float,
        cooldown_seconds: int = 30,
        bb_period: int = 21,
        bb_sigma: float = 2.0,
        strong_trend_slope_pips: float = 3.0,
        history_limit: int = 200,
        atr_threshold_pips: float = 0.0,
    ) -> None:
        self.cooldown_seconds = cooldown_seconds
        self._bb_period = bb_period
        self._bb_sigma = bb_sigma
        self._store = store
        self._pip_size = pip_size
        self._strong_trend_slope = strong_trend_slope_pips
        self._history_limit = history_limit
        self._atr_threshold_pips = atr_threshold_pips

        self._last_signal: Dict[Tuple[Strategy, str, str, str], datetime] = {}
        self._last_indicator_timestamp: Dict[Tuple[Strategy, str, str, str], datetime] = {}
        self._histories: Dict[Strategy, Deque[SignalEvent]] = defaultdict(
            lambda: deque(maxlen=self._history_limit)
        )
        self._previous_snapshots: Dict[Tuple[str, str], IndicatorSnapshot] = {}

    def set_atr_threshold(self, threshold_pips: float) -> None:
        """Update ATR threshold in pips."""
        self._atr_threshold_pips = threshold_pips

    def get_atr_threshold(self) -> float:
        """Get current ATR threshold in pips."""
        return self._atr_threshold_pips

    def evaluate(
        self,
        *,
        symbol: str,
        timeframe: str,
        timeframe_seconds: int,
        price: float,
        indicator: IndicatorSnapshot,
        timestamp: datetime,
        candles: Sequence[Candle],
    ) -> list[SignalEvent]:
        if is_blackout(timestamp):
            return []

        ctx = StrategyContext(
            symbol=symbol,
            timeframe=timeframe,
            timeframe_seconds=timeframe_seconds,
            price=price,
            indicator=indicator,
            timestamp=timestamp,
            candles=candles,
            get_other_snapshot=self._make_snapshot_getter(symbol),
            previous_snapshot=self._previous_snapshots.get((symbol, timeframe)),
            pip_size=self._pip_size,
        )

        events: list[SignalEvent] = []
        trend_ready = bool(ctx.indicator.trend.get("ready", True))
        if not trend_ready:
            return events

        # Check ATR threshold for 1m timeframe
        if timeframe == "1m" and self._atr_threshold_pips > 0:
            atr14 = ctx.indicator.atr.get("14")
            if atr14 is not None:
                atr_pips = atr14 / self._pip_size
                if atr_pips < self._atr_threshold_pips:
                    return events
        for strategy in self._strategies_for_timeframe(timeframe):
            handler = self._strategy_handlers[strategy]
            event = handler(self, ctx)
            if event is None:
                continue
            if self._register_event(event, indicator):
                events.append(event)

        self._previous_snapshots[(symbol, timeframe)] = indicator
        return events

    def get_history(self, strategy: Optional[Strategy] = None) -> dict[str, list[dict[str, object]]]:
        strategies: Iterable[Strategy]
        if strategy is not None:
            strategies = (strategy,)
        else:
            strategies = Strategy

        result: dict[str, list[dict[str, object]]] = {}
        for strat in strategies:
            events = list(self._histories.get(strat, []))
            if not events:
                continue
            result[strat.value] = [event.as_dict() for event in events]
        return result

    def get_summary(
        self,
        strategy: Optional[Strategy] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> dict[str, dict[str, object]]:
        """Calculate performance summary for each strategy."""
        strategies: Iterable[Strategy]
        if strategy is not None:
            strategies = (strategy,)
        else:
            strategies = Strategy

        result: dict[str, dict[str, object]] = {}
        for strat in strategies:
            events = list(self._histories.get(strat, []))
            if not events:
                continue

            # Filter by date range
            filtered = events
            if from_date is not None:
                filtered = [e for e in filtered if e.occurred_at >= from_date]
            if to_date is not None:
                filtered = [e for e in filtered if e.occurred_at <= to_date]

            if not filtered:
                continue

            # Calculate statistics
            total_signals = len(filtered)
            open_signals = [e for e in filtered if e.trade_action in ("OPEN", "REVERSE")]
            close_signals = [e for e in filtered if e.trade_action == "CLOSE"]

            total_pnl = sum(e.pnl for e in close_signals if e.pnl is not None)
            total_pips = sum(e.pips for e in close_signals if e.pips is not None)

            wins = [e for e in close_signals if e.pips is not None and e.pips > 0]
            losses = [e for e in close_signals if e.pips is not None and e.pips < 0]
            win_count = len(wins)
            loss_count = len(losses)
            win_rate = (win_count / len(close_signals) * 100) if close_signals else 0.0

            avg_pnl = total_pnl / len(close_signals) if close_signals else 0.0
            max_profit = max((e.pnl for e in close_signals if e.pnl is not None), default=0.0)
            max_loss = min((e.pnl for e in close_signals if e.pnl is not None), default=0.0)

            result[strat.value] = {
                "strategy": strat.value,
                "strategy_name": STRATEGY_LABELS.get(strat, strat.value),
                "total_signals": total_signals,
                "total_trades": len(open_signals),
                "total_closes": len(close_signals),
                "win_count": win_count,
                "loss_count": loss_count,
                "win_rate": round(win_rate, 2),
                "total_pnl": round(total_pnl, 2),
                "total_pips": round(total_pips, 2),
                "avg_pnl": round(avg_pnl, 2),
                "max_profit": round(max_profit, 2),
                "max_loss": round(max_loss, 2),
            }

        return result

    # Internal helpers -------------------------------------------------

    def _register_event(self, event: SignalEvent, indicator: IndicatorSnapshot) -> bool:
        key = (event.strategy, event.symbol, event.timeframe, event.direction)
        last_indicator_ts = self._last_indicator_timestamp.get(key)
        if last_indicator_ts == indicator.timestamp:
            return False

        if event.trade_action == "CLOSE":
            self._last_indicator_timestamp[key] = indicator.timestamp
            self._last_signal[key] = event.occurred_at
            self._histories[event.strategy].append(event)
            return True

        last_time = self._last_signal.get(key)
        if last_time is not None:
            delta = (event.occurred_at - last_time).total_seconds()
            if delta < self.cooldown_seconds:
                return False

        self._last_indicator_timestamp[key] = indicator.timestamp
        self._last_signal[key] = event.occurred_at
        self._histories[event.strategy].append(event)
        return True

    def _strategies_for_timeframe(self, timeframe: str) -> Iterable[Strategy]:
        if timeframe == "1m":
            return (
                Strategy.BB_MEAN_REVERSION_1M,
                Strategy.MA_TOUCH_BOUNCE_1M,
                Strategy.FAKE_BREAKOUT_1M,
                Strategy.MA_CROSS_TREND_1M,
                Strategy.TREND_PULLBACK_1M,
            )
        if timeframe == "5m":
            return (Strategy.MA_TOUCH_BOUNCE_5M,)
        return ()

    def _make_snapshot_getter(self, symbol: str) -> Callable[[int], Optional[IndicatorSnapshot]]:
        def getter(timeframe_seconds: int) -> Optional[IndicatorSnapshot]:
            return self._store.get_snapshot(symbol, timeframe_seconds)

        return getter

    # Strategy handlers ------------------------------------------------

    def _evaluate_bb_mean_reversion(self, ctx: StrategyContext) -> Optional[SignalEvent]:
        if ctx.timeframe != "1m":
            return None
        upper, lower = ctx.indicator.get_bb(self._bb_period, self._bb_sigma)
        if upper is None or lower is None:
            return None

        rsi14 = ctx.indicator.rsi.get("14")
        if rsi14 is None:
            return None

        trend_dir = str(ctx.indicator.trend.get("direction", "")).lower()
        direction: Optional[str] = None

        if ctx.price >= upper and rsi14 >= 70 and trend_dir in {"flat", "up"}:
            direction = "SELL"
        elif ctx.price <= lower and rsi14 <= 30 and trend_dir in {"flat", "down"}:
            direction = "BUY"

        if direction is None:
            return None

        return self._create_event(Strategy.BB_MEAN_REVERSION_1M, ctx, direction)

    def _evaluate_ma_touch_bounce_1m(self, ctx: StrategyContext) -> Optional[SignalEvent]:
        if ctx.timeframe != "1m" or not ctx.candles:
            return None
        sma21 = self._get_sma(ctx.indicator, 21)
        if sma21 is None:
            return None

        last_candle = ctx.candles[-1]
        trend_dir = str(ctx.indicator.trend.get("direction", "")).lower()

        if not (last_candle.low <= sma21 <= last_candle.high):
            return None

        if trend_dir == "up" and last_candle.close > sma21:
            return self._create_event(Strategy.MA_TOUCH_BOUNCE_1M, ctx, "BUY")
        if trend_dir == "down" and last_candle.close < sma21:
            return self._create_event(Strategy.MA_TOUCH_BOUNCE_1M, ctx, "SELL")
        return None

    def _evaluate_ma_touch_bounce_5m(self, ctx: StrategyContext) -> Optional[SignalEvent]:
        if ctx.timeframe != "5m" or not ctx.candles:
            return None
        sma21 = self._get_sma(ctx.indicator, 21)
        if sma21 is None:
            return None

        last_candle = ctx.candles[-1]
        trend_dir = str(ctx.indicator.trend.get("direction", "")).lower()

        if not (last_candle.low <= sma21 <= last_candle.high):
            return None

        if trend_dir == "up" and last_candle.close > sma21:
            return self._create_event(Strategy.MA_TOUCH_BOUNCE_5M, ctx, "BUY")
        if trend_dir == "down" and last_candle.close < sma21:
            return self._create_event(Strategy.MA_TOUCH_BOUNCE_5M, ctx, "SELL")
        return None

    def _evaluate_fake_breakout(self, ctx: StrategyContext) -> Optional[SignalEvent]:
        if ctx.timeframe != "1m" or len(ctx.candles) < 6:
            return None

        trend_1m = str(ctx.indicator.trend.get("direction", "")).lower()
        snapshot_5m = ctx.get_other_snapshot(TIMEFRAME_SECONDS["5m"])
        trend_5m = str(snapshot_5m.trend.get("direction", "")).lower() if snapshot_5m else ""

        if trend_1m != "flat" or trend_5m != "flat":
            return None

        base = ctx.candles[-6:-1]
        last = ctx.candles[-1]
        recent_high = max(c.high for c in base)
        recent_low = min(c.low for c in base)

        if last.high > recent_high and last.close <= recent_high:
            return self._create_event(Strategy.FAKE_BREAKOUT_1M, ctx, "SELL")
        if last.low < recent_low and last.close >= recent_low:
            return self._create_event(Strategy.FAKE_BREAKOUT_1M, ctx, "BUY")
        return None

    def _evaluate_ma_cross_trend(self, ctx: StrategyContext) -> Optional[SignalEvent]:
        if ctx.timeframe != "1m" or ctx.previous_snapshot is None:
            return None

        curr_sma5 = self._get_sma(ctx.indicator, 5)
        curr_sma21 = self._get_sma(ctx.indicator, 21)
        prev_sma5 = self._get_sma(ctx.previous_snapshot, 5)
        prev_sma21 = self._get_sma(ctx.previous_snapshot, 21)

        if None in (curr_sma5, curr_sma21, prev_sma5, prev_sma21):
            return None

        trend_dir = str(ctx.indicator.trend.get("direction", "")).lower()

        crossed_up = prev_sma5 <= prev_sma21 and curr_sma5 > curr_sma21
        crossed_down = prev_sma5 >= prev_sma21 and curr_sma5 < curr_sma21

        if trend_dir == "up" and crossed_up:
            return self._create_event(Strategy.MA_CROSS_TREND_1M, ctx, "BUY")
        if trend_dir == "down" and crossed_down:
            return self._create_event(Strategy.MA_CROSS_TREND_1M, ctx, "SELL")
        return None

    def _evaluate_trend_pullback(self, ctx: StrategyContext) -> Optional[SignalEvent]:
        if ctx.timeframe != "1m" or not ctx.candles:
            return None

        sma5 = self._get_sma(ctx.indicator, 5)
        sma21 = self._get_sma(ctx.indicator, 21)
        if sma5 is None or sma21 is None:
            return None

        last_candle = ctx.candles[-1]
        trend_dir = str(ctx.indicator.trend.get("direction", "")).lower()
        if trend_dir not in {"up", "down"}:
            return None

        if trend_dir == "up" and ctx.price >= sma21 and last_candle.low <= sma5 <= last_candle.high:
            return self._create_event(Strategy.TREND_PULLBACK_1M, ctx, "BUY")
        if trend_dir == "down" and ctx.price <= sma21 and last_candle.low <= sma5 <= last_candle.high:
            return self._create_event(Strategy.TREND_PULLBACK_1M, ctx, "SELL")
        return None

    # Shared utilities -------------------------------------------------

    def _create_event(self, strategy: Strategy, ctx: StrategyContext, direction: str) -> SignalEvent:
        return SignalEvent(
            symbol=ctx.symbol,
            timeframe=ctx.timeframe,
            direction=direction,
            price=ctx.price,
            occurred_at=ctx.timestamp,
            indicators=ctx.indicator,
            strategy=strategy,
        )

    @staticmethod
    def _get_sma(snapshot: IndicatorSnapshot, period: int) -> Optional[float]:
        return snapshot.sma.get(str(period))

    def record_close_event(
        self,
        *,
        symbol: str,
        timeframe: str,
        price: float,
        timestamp: datetime,
        indicator: IndicatorSnapshot,
        direction: str,
        pnl: float,
        pips: float,
        strategy_key: str,
    ) -> SignalEvent:
        try:
            strategy = Strategy(strategy_key)
        except ValueError:
            strategy = Strategy.POSITION_CLOSE
        event = SignalEvent(
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            price=price,
            occurred_at=timestamp,
            indicators=indicator,
            strategy=strategy,
            trade_action="CLOSE",
            pnl=pnl,
            pips=pips,
        )
        self._register_event(event, indicator)
        return event

    _strategy_handlers: dict[Strategy, Callable[[StrategyContext], Optional[SignalEvent]]] = {
        Strategy.BB_MEAN_REVERSION_1M: _evaluate_bb_mean_reversion,
        Strategy.MA_TOUCH_BOUNCE_1M: _evaluate_ma_touch_bounce_1m,
        Strategy.MA_TOUCH_BOUNCE_5M: _evaluate_ma_touch_bounce_5m,
        Strategy.FAKE_BREAKOUT_1M: _evaluate_fake_breakout,
        Strategy.MA_CROSS_TREND_1M: _evaluate_ma_cross_trend,
        Strategy.TREND_PULLBACK_1M: _evaluate_trend_pullback,
    }
