from datetime import datetime, timezone

from app.services.positions import PositionManager

BASE_TS = datetime(2024, 1, 1, tzinfo=timezone.utc)


def test_open_and_reverse_position():
    manager = PositionManager(pip_size=0.001, lot_size=100, stop_loss_pips=20, take_profit_pips=40, fee_rate=0.00002)
    open_events = manager.handle_signal("USD_JPY", "BUY", 150.0, BASE_TS)
    assert len(open_events) == 1
    assert open_events[0].event_type == "OPEN"
    assert open_events[0].fee_paid > 0
    assert open_events[0].pnl == -open_events[0].fee_paid
    assert manager.get_positions()

    reverse_events = manager.handle_signal("USD_JPY", "SELL", 150.2, BASE_TS)
    assert len(reverse_events) == 2
    assert reverse_events[0].event_type == "REVERSE"
    assert reverse_events[1].event_type == "OPEN"


def test_stop_loss_trigger():
    manager = PositionManager(pip_size=0.001, lot_size=100, stop_loss_pips=10, take_profit_pips=20, fee_rate=0.00002)
    manager.handle_signal("USD_JPY", "BUY", 150.0, BASE_TS)
    # 10 pips = 0.01 （pip_size=0.001）
    event = manager.evaluate_price("USD_JPY", 149.99, BASE_TS)
    assert event is not None
    assert event.event_type == "STOP_LOSS"
    assert not manager.get_positions()


def test_manual_close_uses_last_price():
    manager = PositionManager(pip_size=0.001, lot_size=100, stop_loss_pips=10, take_profit_pips=20, fee_rate=0.00002)
    manager.handle_signal("USD_JPY", "SELL", 150.0, BASE_TS)
    manager.evaluate_price("USD_JPY", 150.005, BASE_TS)  # update last price without閉
    event = manager.close_position("USD_JPY", price=149.8, timestamp=BASE_TS)
    assert event is not None
    assert event.pnl > 0
