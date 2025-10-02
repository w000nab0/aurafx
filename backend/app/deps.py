from __future__ import annotations

from typing import Optional

from .core.signals import SignalEngine
from .core.indicators import IndicatorEngine
from .services.broadcast import BroadcastHub
from .services.positions import PositionManager
from .services.config_store import TradingConfigStore
from .services.gmo_client import GMOClient
from .services.live_trading import LiveTradingController
from .services.order_dispatcher import GMOOrderDispatcher
from .services.signals_repository import SignalRepository

position_manager: Optional[PositionManager] = None
broadcast_hub: Optional[BroadcastHub] = None
signal_engine: Optional[SignalEngine] = None
trading_config_store: Optional[TradingConfigStore] = None
gmo_client: Optional[GMOClient] = None
live_trader: Optional[LiveTradingController] = None
indicator_engine: Optional[IndicatorEngine] = None
signal_repository: Optional[SignalRepository] = None
order_dispatcher: Optional[GMOOrderDispatcher] = None


def get_position_manager() -> PositionManager:
    if position_manager is None:
        raise RuntimeError("PositionManager is not initialized")
    return position_manager


def get_broadcast_hub() -> BroadcastHub:
    if broadcast_hub is None:
        raise RuntimeError("BroadcastHub is not initialized")
    return broadcast_hub


def get_signal_engine() -> SignalEngine:
    if signal_engine is None:
        raise RuntimeError("SignalEngine is not initialized")
    return signal_engine


def get_trading_config_store() -> TradingConfigStore:
    if trading_config_store is None:
        raise RuntimeError("TradingConfigStore is not initialized")
    return trading_config_store


def get_gmo_client() -> GMOClient:
    if gmo_client is None:
        raise RuntimeError("GMOClient is not initialized")
    return gmo_client


def get_live_trader() -> LiveTradingController:
    if live_trader is None:
        raise RuntimeError("LiveTradingController is not initialized")
    return live_trader


def get_live_trader_optional() -> LiveTradingController | None:
    return live_trader


def get_indicator_engine() -> IndicatorEngine:
    if indicator_engine is None:
        raise RuntimeError("IndicatorEngine is not initialized")
    return indicator_engine


def get_signal_repository() -> SignalRepository:
    if signal_repository is None:
        raise RuntimeError("SignalRepository is not initialized")
    return signal_repository


def get_order_dispatcher() -> GMOOrderDispatcher:
    if order_dispatcher is None:
        raise RuntimeError("GMOOrderDispatcher is not initialized")
    return order_dispatcher
