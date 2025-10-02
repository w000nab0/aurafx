from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

import httpx

logger = logging.getLogger(__name__)


class OrderDispatchSkip(Exception):
    """Raised by job callbacks to indicate that the dispatch can be skipped."""


@dataclass
class _DispatchJob:
    coro_factory: Callable[[], Awaitable[object]]
    future: asyncio.Future
    description: str


class GMOOrderDispatcher:
    """Serialises GMO API POST calls with rate limiting and retries."""

    def __init__(
        self,
        *,
        min_interval: float = 1.1,
        max_retries: int = 3,
        base_backoff: float = 1.0,
    ) -> None:
        self._queue: asyncio.Queue[_DispatchJob | None] = asyncio.Queue()
        self._worker: Optional[asyncio.Task[None]] = None
        self._min_interval = min_interval
        self._max_retries = max_retries
        self._base_backoff = base_backoff
        self._last_sent_at = 0.0
        self._shutdown = asyncio.Event()

    async def start(self) -> None:
        if self._worker is None:
            self._worker = asyncio.create_task(self._run(), name="gmo-order-dispatcher")

    async def stop(self) -> None:
        if self._worker is None:
            return
        await self._queue.put(None)
        await self._worker
        self._worker = None

    async def submit(self, coro_factory: Callable[[], Awaitable[object]], *, description: str) -> object:
        if self._worker is None:
            await self.start()
        loop = asyncio.get_running_loop()
        future: asyncio.Future = loop.create_future()
        await self._queue.put(_DispatchJob(coro_factory=coro_factory, future=future, description=description))
        return await future

    async def _run(self) -> None:
        while True:
            job = await self._queue.get()
            if job is None:
                break
            await self._respect_rate_limit()
            try:
                result = await self._execute_with_retry(job)
            except OrderDispatchSkip:
                if not job.future.done():
                    job.future.set_result(None)
            except Exception as exc:  # pragma: no cover - defensive path
                logger.exception("Order dispatch failed: %s", job.description)
                if not job.future.done():
                    job.future.set_exception(exc)
            else:
                if not job.future.done():
                    job.future.set_result(result)

    async def _respect_rate_limit(self) -> None:
        now = time.monotonic()
        wait = self._min_interval - (now - self._last_sent_at)
        if wait > 0:
            await asyncio.sleep(wait)

    async def _execute_with_retry(self, job: _DispatchJob) -> object:
        attempt = 0
        while True:
            try:
                result = await job.coro_factory()
                self._last_sent_at = time.monotonic()
                return result
            except OrderDispatchSkip:
                raise
            except httpx.HTTPStatusError as exc:
                attempt += 1
                status = exc.response.status_code
                if status == 429 or status >= 500:
                    if attempt > self._max_retries:
                        logger.error(
                            "Order dispatch exhausted retries (%s): %s -> %s",
                            self._max_retries,
                            job.description,
                            status,
                        )
                        raise
                    delay = self._compute_backoff(attempt)
                    logger.warning(
                        "Order dispatch retry %s/%s after %ss (status %s): %s",
                        attempt,
                        self._max_retries,
                        delay,
                        status,
                        job.description,
                    )
                    await asyncio.sleep(delay)
                    continue
                raise
            except Exception:
                attempt += 1
                if attempt > self._max_retries:
                    logger.exception("Order dispatch failed after retries: %s", job.description)
                    raise
                delay = self._compute_backoff(attempt)
                logger.warning(
                    "Order dispatch retry %s/%s after %ss: %s",
                    attempt,
                    self._max_retries,
                    delay,
                    job.description,
                )
                await asyncio.sleep(delay)

    def _compute_backoff(self, attempt: int) -> float:
        return self._base_backoff * (2 ** (attempt - 1))


__all__ = ["GMOOrderDispatcher", "OrderDispatchSkip"]
