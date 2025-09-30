from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from ...deps import get_broadcast_hub, get_position_manager
from ...services.positions import PositionManager
from ...schemas.trading import (
    PositionEventPayload,
    PositionSnapshot,
    TradingConfig,
    TradingConfigUpdate,
)

router = APIRouter(prefix="/api/trading", tags=["trading"])


@router.get("/config", response_model=TradingConfig)
async def get_trading_config(manager: PositionManager = Depends(get_position_manager)) -> TradingConfig:
    return TradingConfig(**manager.get_config())


@router.put("/config", response_model=TradingConfig)
async def update_trading_config(
    payload: TradingConfigUpdate,
    manager: PositionManager = Depends(get_position_manager),
) -> TradingConfig:
    manager.update_config(
        pip_size=payload.pip_size,
        lot_size=payload.lot_size,
        stop_loss_pips=payload.stop_loss_pips,
        take_profit_pips=payload.take_profit_pips,
    )
    return TradingConfig(**manager.get_config())


@router.get("/positions", response_model=list[PositionSnapshot])
async def get_positions(manager: PositionManager = Depends(get_position_manager)) -> list[PositionSnapshot]:
    return [PositionSnapshot(**item) for item in manager.serialize_positions()]


@router.post("/positions/{symbol}/close", response_model=PositionEventPayload)
async def close_position(
    symbol: str,
    manager: PositionManager = Depends(get_position_manager),
    broadcast = Depends(get_broadcast_hub),
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
    payload = PositionEventPayload(**event.as_dict())
    await broadcast.publish({"type": "position", "data": payload.dict()})  # type: ignore[attr-defined]
    return payload
