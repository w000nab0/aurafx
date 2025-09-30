from __future__ import annotations

import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .core.candles import CandleAggregator
from .core.indicators import IndicatorEngine, IndicatorStore
from .core.signals import SignalEngine
from .core.stream import MarketStream
from .services.broadcast import BroadcastHub
from .services.positions import PositionManager
from . import deps
from .api.routes import trading

logger = logging.getLogger(__name__)
logging.basicConfig(level=settings.log_level)

broadcast_hub = BroadcastHub()
aggregator = CandleAggregator(timeframes=[60, 300])
indicator_store = IndicatorStore()
indicator_config = settings.indicator_config
position_config = settings.position_config
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
)
signal_engine = SignalEngine(
    cooldown_seconds=settings.signal_cooldown_sec,
    bb_period=int(indicator_config.get("bb_period", 21)),
    bb_sigma=signal_bb_sigma,
)
position_manager = PositionManager(
    pip_size=float(position_config.get("pip_size", 0.001)),
    lot_size=float(position_config.get("lot_size", 100)),
    stop_loss_pips=float(position_config.get("stop_loss_pips", 20)),
    take_profit_pips=float(position_config.get("take_profit_pips", 40)),
    fee_rate=float(position_config.get("fee_rate", 0.00002)),
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
)
deps.position_manager = position_manager
deps.broadcast_hub = broadcast_hub


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:  # pragma: no cover - startup logic
    logger.info("Starting aurafx backend with symbols=%s", settings.gmo_symbols)
    stream_task = asyncio.create_task(market_stream.run(), name="market-stream")
    try:
        yield
    finally:
        market_stream.stop()
        stream_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await stream_task
        await broadcast_hub.close()


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
