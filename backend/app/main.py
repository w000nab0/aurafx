from __future__ import annotations

import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .core.blackout import parse_blackout_windows, set_blackout_windows
from .core.candles import CandleAggregator
from .core.indicators import IndicatorEngine, IndicatorStore
from .core.signals import SignalEngine
from .core.stream import MarketStream
from .db import get_session_factory, init_database
from .services.broadcast import BroadcastHub
from .services.positions import PositionManager
from .services.gmo_client import GMOClient
from .services.live_trading import LiveTradingController
from .services.config_store import TradingConfigStore
from .services.signals_repository import SignalRepository
from .services.order_repository import OrderRepository
from .services.execution_reconciler import ExecutionReconciler
from .services.order_dispatcher import GMOOrderDispatcher
from . import deps
from .api.routes import trading

logger = logging.getLogger(__name__)
logging.basicConfig(level=settings.log_level)

broadcast_hub = BroadcastHub()
aggregator = CandleAggregator(timeframes=[60, 300])
indicator_store = IndicatorStore()
indicator_config = settings.indicator_config
position_config = settings.position_config
config_store_path = settings.trading_config_path or "runtime/trading_config.json"
trading_config_store = TradingConfigStore(Path(config_store_path))
session_factory = get_session_factory()
signal_repository = SignalRepository(session_factory)
order_repository = OrderRepository(session_factory)
order_dispatcher: GMOOrderDispatcher | None = None
execution_reconciler: ExecutionReconciler | None = None

loaded_config = trading_config_store.load()
atr_threshold_pips = 0.0
if loaded_config is not None:
    position_config = {
        **position_config,
        "pip_size": loaded_config.pip_size,
        "lot_size": loaded_config.lot_size,
        "stop_loss_pips": loaded_config.stop_loss_pips,
        "take_profit_pips": loaded_config.take_profit_pips,
        "fee_rate": loaded_config.fee_rate,
    }
    indicator_config = {
        **indicator_config,
        "trend_sma_period": loaded_config.trend_sma_period,
        "trend_threshold_pips": loaded_config.trend_threshold_pips,
    }
    atr_threshold_pips = loaded_config.atr_threshold_pips
    try:
        blackout_windows = parse_blackout_windows(loaded_config.blackout_windows or [])
        set_blackout_windows(blackout_windows)
    except ValueError:
        logger.warning("Invalid blackout window configuration detected; using defaults")

bb_sigmas = [float(x) for x in indicator_config.get("bb_sigmas", [2.0])]
signal_bb_sigma = float(indicator_config.get("signal_bb_sigma", bb_sigmas[0]))
indicator_engine = IndicatorEngine(
    store=indicator_store,
    sma_periods=[int(x) for x in indicator_config.get("sma_periods", [5, 21])],
    rsi_periods=[int(x) for x in indicator_config.get("rsi_periods", [14])],
    rci_periods=[int(x) for x in indicator_config.get("rci_periods", [6, 9, 27])],
    bb_period=int(indicator_config.get("bb_period", 21)),
    bb_sigmas=bb_sigmas,
    trend_window=int(indicator_config.get("trend_window", 10)),
    trend_threshold_pips=float(indicator_config.get("trend_threshold_pips", 1.5)),
    pip_size=float(position_config.get("pip_size", 0.001)),
    max_rows=int(indicator_config.get("max_rows", 1000)),
    trend_sma_period=int(indicator_config.get("trend_sma_period", 21)),
)
pip_size = float(position_config.get("pip_size", 0.001))
signal_engine = SignalEngine(
    store=indicator_store,
    pip_size=pip_size,
    cooldown_seconds=settings.signal_cooldown_sec,
    bb_period=int(indicator_config.get("bb_period", 21)),
    bb_sigma=signal_bb_sigma,
    strong_trend_slope_pips=float(indicator_config.get("strong_trend_slope_pips", 3.0)),
    atr_threshold_pips=atr_threshold_pips,
)
trading_active_default = loaded_config.trading_active if loaded_config is not None else False

position_manager = PositionManager(
    pip_size=pip_size,
    lot_size=float(position_config.get("lot_size", 100)),
    stop_loss_pips=float(position_config.get("stop_loss_pips", 20)),
    take_profit_pips=float(position_config.get("take_profit_pips", 40)),
    fee_rate=float(position_config.get("fee_rate", 0.00002)),
    trading_active=trading_active_default,
)

gmo_client: GMOClient | None = None
live_trader: LiveTradingController | None = None
if settings.gmo_api_key and settings.gmo_api_secret:
    gmo_client = GMOClient(
        base_url=settings.gmo_private_base_url,
        api_key=settings.gmo_api_key,
        api_secret=settings.gmo_api_secret,
    )
    order_dispatcher = GMOOrderDispatcher()
    live_trader = LiveTradingController(
        client=gmo_client,
        position_manager=position_manager,
        order_dispatcher=order_dispatcher,
        order_repository=order_repository,
        broadcaster=broadcast_hub,
    )
    execution_reconciler = ExecutionReconciler(
        client=gmo_client,
        order_repository=order_repository,
        live_trader=live_trader,
        position_manager=position_manager,
    )
market_stream = MarketStream(
    endpoint=settings.websocket_endpoint,
    symbols=settings.gmo_symbols,
    broadcast=broadcast_hub,
    aggregator=aggregator,
    indicator_engine=indicator_engine,
    indicator_store=indicator_store,
    signal_engine=signal_engine,
    position_manager=position_manager,
    live_trader=live_trader,
    signal_repository=signal_repository,
)
deps.position_manager = position_manager
deps.broadcast_hub = broadcast_hub
deps.signal_engine = signal_engine
deps.trading_config_store = trading_config_store
deps.gmo_client = gmo_client
deps.live_trader = live_trader
deps.indicator_engine = indicator_engine
deps.signal_repository = signal_repository
deps.order_dispatcher = order_dispatcher
deps.order_repository = order_repository


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:  # pragma: no cover - startup logic
    logger.info("Starting aurafx backend with symbols=%s", settings.gmo_symbols)
    await init_database()
    if order_dispatcher is not None:
        await order_dispatcher.start()
    if execution_reconciler is not None:
        await execution_reconciler.start()
    stream_task = asyncio.create_task(market_stream.run(), name="market-stream")
    try:
        yield
    finally:
        market_stream.stop()
        stream_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await stream_task
        await broadcast_hub.close()
        if gmo_client is not None:
            await gmo_client.close()
        if order_dispatcher is not None:
            await order_dispatcher.stop()
        if execution_reconciler is not None:
            await execution_reconciler.stop()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trading.router)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/prices")
async def ws_prices(websocket: WebSocket) -> None:
    await websocket.accept()
    subscription = broadcast_hub.subscribe()
    try:
        async for payload in subscription:
            await websocket.send_json(payload)
    finally:
        await broadcast_hub.unsubscribe(subscription)
