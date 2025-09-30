from datetime import datetime, timezone, timedelta

from app.core.candles import Candle
from app.core.indicators import IndicatorEngine, IndicatorSnapshot, IndicatorStore
from app.core.signals import SignalEngine


def make_candle(minute: int, close: float) -> Candle:
    ts = datetime(2024, 1, 1, 0, minute, tzinfo=timezone.utc)
    return Candle(
        timestamp=ts,
        open=close,
        high=close + 0.1,
        low=close - 0.1,
        close=close,
        volume=100,
    )


def test_indicator_engine_produces_snapshot() -> None:
    store = IndicatorStore()
    engine = IndicatorEngine(
        store=store,
        sma_periods=[3],
        rsi_periods=[3],
        rci_periods=[3],
        bb_period=3,
        bb_sigmas=[2.0],
        trend_window=3,
        trend_threshold_pips=0.1,
        pip_size=0.001,
        max_rows=100,
    )

    snapshot = None
    for idx, close in enumerate([100.0, 101.0, 102.0, 103.0]):
        candle = make_candle(idx, close)
        snapshot = engine.handle_candle("USD_JPY", 60, candle)

    assert snapshot is not None
    assert snapshot.close == 103.0
    assert round(snapshot.sma.get("3", 0.0), 2) == 102.0
    assert "3" in snapshot.rsi
    assert "3" in snapshot.rci
    bb = snapshot.bb.get("3_2.0") or snapshot.bb.get("3_2")
    assert bb is not None and bb.get("upper") is not None
    latest = store.get_snapshot("USD_JPY", 60)
    assert latest is snapshot


def test_signal_engine_emits_and_respects_cooldown() -> None:
    signal_engine = SignalEngine(cooldown_seconds=30, bb_period=21, bb_sigma=2.0)
    base_ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    indicator = IndicatorSnapshot(
        symbol="USD_JPY",
        timeframe="1m",
        timestamp=base_ts,
        close=105.0,
        sma={"21": 105.0},
        rsi={"14": 55.0},
        rci={},
        bb={"21_2.0": {"upper": 105.5, "lower": 104.5, "mid": 105.0}},
        trend={"direction": "up", "slope": 0.0, "slope_pips": 0.0, "window": 10, "method": "regression"},
    )

    event = signal_engine.evaluate(
        symbol="USD_JPY",
        timeframe="1m",
        price=106.0,
        indicator=indicator,
        timestamp=base_ts + timedelta(seconds=1),
    )
    assert event is not None
    assert event.direction == "SELL"

    # Same indicator timestamp -> suppressed
    event_again = signal_engine.evaluate(
        symbol="USD_JPY",
        timeframe="1m",
        price=106.5,
        indicator=indicator,
        timestamp=base_ts + timedelta(seconds=2),
    )
    assert event_again is None

    # New indicator timestamp but within cooldown -> suppressed
    new_indicator = IndicatorSnapshot(
        symbol="USD_JPY",
        timeframe="1m",
        timestamp=base_ts + timedelta(seconds=10),
        close=105.2,
        sma={"21": 105.1},
        rsi={"14": 60.0},
        rci={},
        bb={"21_2.0": {"upper": 105.6, "lower": 104.6, "mid": 105.1}},
        trend={"direction": "up", "slope": 0.0, "slope_pips": 0.0, "window": 10, "method": "regression"},
    )
    still_suppressed = signal_engine.evaluate(
        symbol="USD_JPY",
        timeframe="1m",
        price=106.0,
        indicator=new_indicator,
        timestamp=base_ts + timedelta(seconds=15),
    )
    assert still_suppressed is None

    # After cooldown with new indicator timestamp -> allowed
    allowed = signal_engine.evaluate(
        symbol="USD_JPY",
        timeframe="1m",
        price=106.0,
        indicator=new_indicator,
        timestamp=base_ts + timedelta(seconds=40),
    )
    assert allowed is not None
    assert allowed.direction == "SELL"
