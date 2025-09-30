from __future__ import annotations

import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .core.stream import MarketStream
from .services.broadcast import BroadcastHub

logger = logging.getLogger(__name__)
logging.basicConfig(level=settings.log_level)

broadcast_hub = BroadcastHub()
market_stream = MarketStream(
    endpoint=settings.websocket_endpoint,
    symbols=settings.gmo_symbols,
    broadcast=broadcast_hub,
)


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
