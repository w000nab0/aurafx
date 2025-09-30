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
        sma_period=3,
        rsi_period=3,
        bb_period=3,
        bb_sigma=2.0,
        max_rows=100,
    )

    snapshot = None
    for idx, close in enumerate([100.0, 101.0, 102.0, 103.0]):
        candle = make_candle(idx, close)
        snapshot = engine.handle_candle("USD_JPY", 60, candle)

    assert snapshot is not None
    assert snapshot.close == 103.0
    assert snapshot.sma is not None and round(snapshot.sma, 2) == 102.0
    assert snapshot.rsi is not None
    assert snapshot.bb_upper is not None
    assert snapshot.bb_lower is not None
    latest = store.get_snapshot("USD_JPY", 60)
    assert latest is snapshot


def test_signal_engine_emits_and_respects_cooldown() -> None:
    signal_engine = SignalEngine(cooldown_seconds=30)
    base_ts = datetime(2024, 1, 1, tzinfo=timezone.utc)
    indicator = IndicatorSnapshot(
        symbol="USD_JPY",
        timeframe="1m",
        timestamp=base_ts,
        close=105.0,
        sma=105.0,
        rsi=55.0,
        bb_upper=105.5,
        bb_lower=104.5,
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
        sma=105.1,
        rsi=60.0,
        bb_upper=105.6,
        bb_lower=104.6,
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
