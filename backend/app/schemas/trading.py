from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class BlackoutWindow(BaseModel):
    start: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    end: str = Field(..., pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")


class TradingConfig(BaseModel):
    pip_size: float = Field(..., gt=0)
    lot_size: float = Field(..., gt=0)
    stop_loss_pips: float = Field(..., gt=0)
    take_profit_pips: float = Field(..., gt=0)
    fee_rate: float = Field(..., ge=0)
    trading_active: bool = Field(...)
    trend_sma_period: int = Field(..., gt=0)
    trend_threshold_pips: float = Field(..., gt=0)
    atr_threshold_pips: float = Field(..., gt=0)
    blackout_windows: list[BlackoutWindow]
    blackout_active: bool


class TradingConfigUpdate(BaseModel):
    pip_size: Optional[float] = Field(None, gt=0)
    lot_size: Optional[float] = Field(None, gt=0)
    stop_loss_pips: Optional[float] = Field(None, gt=0)
    take_profit_pips: Optional[float] = Field(None, gt=0)
    fee_rate: Optional[float] = Field(None, ge=0)
    trading_active: Optional[bool] = None
    trend_sma_period: Optional[int] = Field(None, gt=0)
    trend_threshold_pips: Optional[float] = Field(None, gt=0)
    atr_threshold_pips: Optional[float] = Field(None, gt=0)
    blackout_windows: Optional[list[BlackoutWindow]] = None


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
    open_fee: Optional[float] = None
    fee_rate: Optional[float] = None
    strategy: Optional[str] = None


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


class SignalEventDetail(BaseModel):
    strategy: str
    strategy_name: str
    symbol: str
    timeframe: str
    direction: str
    price: float
    occurred_at: datetime
    indicator_timestamp: datetime
    close: float
    sma: Dict[str, Optional[float]]
    rsi: Dict[str, Optional[float]]
    rci: Dict[str, Optional[float]]
    bb: Dict[str, Dict[str, Optional[float]]]
    trend: Dict[str, Any]
    trade_action: Optional[str] = None
    pnl: Optional[float] = None
    pips: Optional[float] = None


class SignalHistoryGroup(BaseModel):
    strategy: str
    strategy_name: str
    events: list[SignalEventDetail]
