from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TradingConfig(BaseModel):
    pip_size: float = Field(..., gt=0)
    lot_size: float = Field(..., gt=0)
    stop_loss_pips: float = Field(..., gt=0)
    take_profit_pips: float = Field(..., gt=0)


class TradingConfigUpdate(BaseModel):
    pip_size: Optional[float] = Field(None, gt=0)
    lot_size: Optional[float] = Field(None, gt=0)
    stop_loss_pips: Optional[float] = Field(None, gt=0)
    take_profit_pips: Optional[float] = Field(None, gt=0)


class PositionSnapshot(BaseModel):
    symbol: str
    direction: str
    entry_price: float
    lot_size: float
    stop_loss: float
    take_profit: float
    opened_at: datetime
    last_price: float
    unrealized_pnl: float


class PositionEventPayload(BaseModel):
    type: str
    symbol: str
    direction: str
    entry_price: float
    lot_size: float
    stop_loss: float
    take_profit: float
    opened_at: datetime
    price: float
    timestamp: datetime
    pnl: float
