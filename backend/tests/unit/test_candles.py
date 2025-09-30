from datetime import datetime, timezone

from app.core.candles import CandleAggregator


def make_ts(minute: int, second: int = 0) -> datetime:
    return datetime(2024, 1, 1, 12, minute, second, tzinfo=timezone.utc)


def test_one_minute_closure() -> None:
    aggregator = CandleAggregator(timeframes=[60, 300])

    aggregator.add_tick("USD_JPY", price=150.10, volume=1000, ts=make_ts(0, 5))
    aggregator.add_tick("USD_JPY", price=150.25, volume=500, ts=make_ts(0, 30))
    closed = aggregator.add_tick("USD_JPY", price=150.15, volume=200, ts=make_ts(1, 0))

    assert len(closed) == 1
    candle = closed[0]
    assert candle.timestamp == make_ts(0, 0)
    assert candle.open == 150.10
    assert candle.close == 150.25
    assert candle.high == 150.25
    assert candle.low == 150.10
    assert candle.volume == 1500


def test_five_minute_candle_aggregates_from_ticks() -> None:
    aggregator = CandleAggregator(timeframes=[60, 300])

    for minute, price in enumerate([150.0, 150.5, 150.2, 149.9, 150.6]):
        closed = aggregator.add_tick("USD_JPY", price=price, volume=100, ts=make_ts(minute, 0))
        # every tick after the first closes the previous one-minute candle
        if minute > 0:
            assert len(closed) == 1

    closed = aggregator.add_tick("USD_JPY", price=150.4, volume=120, ts=make_ts(5, 0))
    # minute 4 closes + first 5-minute bucket closes
    assert len(closed) == 2
    minute_candle = next(c for c in closed if c.timestamp == make_ts(4, 0))
    five_min_candle = next(c for c in closed if c.timestamp == make_ts(0, 0))

    assert minute_candle.open == 150.6
    assert minute_candle.close == 150.6
    assert minute_candle.volume == 100

    assert five_min_candle.open == 150.0
    assert five_min_candle.high == 150.6
    assert five_min_candle.low == 149.9
    assert five_min_candle.close == 150.6
    assert five_min_candle.volume == 500


def test_flush_open_candles_moves_to_history() -> None:
    aggregator = CandleAggregator(timeframes=[60])
    aggregator.add_tick("USD_JPY", price=150.0, volume=50, ts=make_ts(0, 0))
    flushed = aggregator.flush_open()
    assert len(flushed) == 1
    history = aggregator.get_candles("USD_JPY", timeframe=60)
    assert len(history) == 1
    assert history[0] == flushed[0]
