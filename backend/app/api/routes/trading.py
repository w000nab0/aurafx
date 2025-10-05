from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ...core.blackout import (
    is_blackout,
    parse_blackout_windows,
    serialize_blackout_windows,
    set_blackout_windows,
)
from ...core.signals import SignalEngine, Strategy, STRATEGY_LABELS
from ...core.indicators import IndicatorSnapshot
from ...deps import (
    get_broadcast_hub,
    get_position_manager,
    get_signal_engine,
    get_trading_config_store,
    get_live_trader_optional,
    get_indicator_engine,
    get_signal_repository,
)
from ...services.positions import PositionManager
from ...services.config_store import TradingConfigData
from ...services.live_trading import LiveTradingController
from ...services.signals_repository import SignalRepository
from ...schemas.trading import (
    PositionEventPayload,
    PositionSnapshot,
    SignalHistoryGroup,
    SignalEventDetail,
    TradingConfig,
    TradingConfigUpdate,
)

router = APIRouter(prefix="/api/trading", tags=["trading"])


@router.get("/config", response_model=TradingConfig)
async def get_trading_config(
    manager: PositionManager = Depends(get_position_manager),
    indicator_engine = Depends(get_indicator_engine),
    signal_engine: SignalEngine = Depends(get_signal_engine),
) -> TradingConfig:
    config = manager.get_config()
    config["trend_sma_period"] = indicator_engine.get_trend_sma_period()
    config["trend_threshold_pips"] = indicator_engine.get_trend_threshold()
    config["atr_threshold_pips"] = signal_engine.get_atr_threshold()
    config["blackout_windows"] = serialize_blackout_windows()
    config["blackout_active"] = bool(is_blackout())
    return TradingConfig(**config)


@router.put("/config", response_model=TradingConfig)
async def update_trading_config(
    payload: TradingConfigUpdate,
    manager: PositionManager = Depends(get_position_manager),
    store = Depends(get_trading_config_store),
    indicator_engine = Depends(get_indicator_engine),
    signal_engine: SignalEngine = Depends(get_signal_engine),
) -> TradingConfig:
    manager.update_config(
        pip_size=payload.pip_size,
        lot_size=payload.lot_size,
        stop_loss_pips=payload.stop_loss_pips,
        take_profit_pips=payload.take_profit_pips,
        fee_rate=payload.fee_rate,
        trading_active=payload.trading_active,
    )
    if payload.trend_sma_period is not None:
        indicator_engine.set_trend_sma_period(payload.trend_sma_period)
    if payload.trend_threshold_pips is not None:
        indicator_engine.set_trend_threshold(payload.trend_threshold_pips)
    if payload.atr_threshold_pips is not None:
        signal_engine.set_atr_threshold(payload.atr_threshold_pips)
    if payload.blackout_windows is not None:
        try:
            parsed = parse_blackout_windows([bw.model_dump() for bw in payload.blackout_windows])
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        set_blackout_windows(parsed)
    config = manager.get_config()
    config["trend_sma_period"] = indicator_engine.get_trend_sma_period()
    config["trend_threshold_pips"] = indicator_engine.get_trend_threshold()
    config["atr_threshold_pips"] = signal_engine.get_atr_threshold()
    config["blackout_windows"] = serialize_blackout_windows()
    config["blackout_active"] = bool(is_blackout())
    config_model = TradingConfig(**config)
    blackout_payload = [window.model_dump() for window in config_model.blackout_windows]
    store.save(
        TradingConfigData(
            pip_size=config_model.pip_size,
            lot_size=config_model.lot_size,
            stop_loss_pips=config_model.stop_loss_pips,
            take_profit_pips=config_model.take_profit_pips,
            fee_rate=config_model.fee_rate,
            trading_active=config_model.trading_active,
            trend_sma_period=config_model.trend_sma_period,
            trend_threshold_pips=config_model.trend_threshold_pips,
            atr_threshold_pips=config_model.atr_threshold_pips,
            blackout_windows=blackout_payload,
        )
    )
    return config_model


@router.get("/positions", response_model=list[PositionSnapshot])
async def get_positions(manager: PositionManager = Depends(get_position_manager)) -> list[PositionSnapshot]:
    return [PositionSnapshot(**item) for item in manager.serialize_positions()]


@router.post("/positions/{symbol}/close", response_model=PositionEventPayload)
async def close_position(
    symbol: str,
    manager: PositionManager = Depends(get_position_manager),
    broadcast = Depends(get_broadcast_hub),
    live_trader: LiveTradingController | None = Depends(get_live_trader_optional),
    signal_engine: SignalEngine = Depends(get_signal_engine),
    indicator_engine = Depends(get_indicator_engine),
    signal_repository: SignalRepository = Depends(get_signal_repository),
) -> PositionEventPayload:
    positions = manager.get_positions()
    position = next((p for p in positions if p.symbol == symbol), None)
    if position is None:
        raise HTTPException(status_code=404, detail="Position not found")
    event = manager.close_position(
        symbol,
        price=manager.get_last_price(symbol),
        timestamp=datetime.utcnow(),
        reason="MANUAL_CLOSE",
    )
    if event is None:
        raise HTTPException(status_code=400, detail="Unable to close position")
    if live_trader is not None:
        try:
            await live_trader.close_position(symbol, event.direction, event.position.lot_size)
        except Exception:
            logging.getLogger(__name__).exception("Failed to execute live close order for %s", symbol)
    payload = PositionEventPayload(**event.as_dict())
    await broadcast.publish({"type": "position", "data": payload.dict()})  # type: ignore[attr-defined]

    timeframe = _infer_timeframe(event.position.strategy)
    snapshot = indicator_engine.get_snapshot(symbol, _timeframe_to_seconds(timeframe))
    if snapshot is None:
        snapshot = _fallback_snapshot(symbol, event.price, event.timestamp, timeframe)
    close_signal = signal_engine.record_close_event(
        symbol=symbol,
        timeframe=timeframe,
        price=event.price,
        timestamp=event.timestamp,
        indicator=snapshot,
        direction=event.position.direction,
        pnl=event.pnl,
        pips=event.pips,
        strategy_key=event.position.strategy,
    )
    await signal_repository.add_events([close_signal])
    await broadcast.publish({"type": "signal", "data": close_signal.as_dict()})  # type: ignore[attr-defined]
    return payload


@router.get("/signals/history", response_model=list[SignalHistoryGroup])
async def get_signal_history(engine: SignalEngine = Depends(get_signal_engine)) -> list[SignalHistoryGroup]:
    history = engine.get_history()
    response: list[SignalHistoryGroup] = []
    for strategy_key, entries in history.items():
        strategy_enum = Strategy(strategy_key)
        response.append(
            SignalHistoryGroup(
                strategy=strategy_key,
                strategy_name=STRATEGY_LABELS[strategy_enum],
                events=[SignalEventDetail(**entry) for entry in entries],
            )
        )
    return response


@router.get("/signals/summary")
async def get_signal_summary(
    from_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date (ISO format)"),
    strategy: Optional[str] = Query(None, description="Strategy filter"),
    engine: SignalEngine = Depends(get_signal_engine),
) -> dict[str, list[dict[str, object]]]:
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None

    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid from_date format: {exc}")

    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid to_date format: {exc}")

    strategy_enum: Optional[Strategy] = None
    if strategy:
        try:
            strategy_enum = Strategy(strategy)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid strategy: {exc}")

    summary = engine.get_summary(strategy=strategy_enum, from_date=from_dt, to_date=to_dt)
    return {"strategies": list(summary.values())}


def _infer_timeframe(strategy_key: str | None) -> str:
    if isinstance(strategy_key, str) and strategy_key.endswith("_5m"):
        return "5m"
    return "1m"


def _timeframe_to_seconds(label: str) -> int:
    if label.endswith("m"):
        try:
            return int(label[:-1]) * 60
        except ValueError:
            return 60
    if label.endswith("s"):
        try:
            return int(label[:-1])
        except ValueError:
            return 60
    return 60


def _fallback_snapshot(
    symbol: str,
    price: float,
    timestamp: datetime,
    timeframe: str,
) -> IndicatorSnapshot:
    return IndicatorSnapshot(
        symbol=symbol,
        timeframe=timeframe,
        timestamp=timestamp,
        close=price,
        sma={},
        rsi={},
        rci={},
        bb={},
        trend={"direction": "flat", "ready": False},
        atr={},
    )
