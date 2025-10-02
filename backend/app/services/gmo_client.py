from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class GMOClient:
    """Async HTTP client for GMOコイン Private REST API."""

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        api_secret: str,
        timeout: float = 10.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._api_secret = api_secret.encode("utf-8")
        self._client = httpx.AsyncClient(base_url=self._base_url, timeout=timeout)
        self._lock = asyncio.Lock()

    async def close(self) -> None:
        await self._client.aclose()

    async def create_market_order(
        self,
        *,
        symbol: str,
        side: str,
        size: float,
    ) -> dict[str, Any]:
        client_order_id = f"AURAFX{int(time.time()*1000)}"
        payload = {
            "symbol": symbol,
            "side": side,
            "size": f"{size:.0f}",
            "clientOrderId": client_order_id[:20],
            "isHedgeable": False,
        }
        return await self._request("POST", "/v1/speedOrder", json_payload=payload)

    async def close_market_order(
        self,
        *,
        symbol: str,
        side: str,
        size: float,
    ) -> dict[str, Any]:
        payload = {
            "symbol": symbol,
            "side": side,
            "executionType": "MARKET",
            "timeInForce": "FAK",
            "size": f"{size:.0f}",
        }
        return await self._request("POST", "/v1/closeOrder", json_payload=payload)

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        body_str = json.dumps(json_payload) if json_payload is not None else ""
        timestamp = f"{int(time.time())}000"
        message = f"{timestamp}{method.upper()}{path}{body_str}".encode("ascii")
        signature = hmac.new(self._api_secret, message, hashlib.sha256).hexdigest()
        headers = {
            "API-KEY": self._api_key,
            "API-TIMESTAMP": timestamp,
            "API-SIGN": signature,
            "Content-Type": "application/json",
        }
        async with self._lock:
            response = await self._client.request(
                method,
                "/private" + path,
                content=body_str if body_str else None,
                headers=headers,
            )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "GMO API request failed: %s %s -> %s",
                method,
                path,
                exc.response.text,
            )
            raise
        data: dict[str, Any] | None = None
        if response.content:
            data = response.json()
            status = data.get("status") if isinstance(data, dict) else None
            if status not in (0, "0", "success", "SUCCESS", None):
                logger.error("GMO API returned non-success status: %s", data)
        else:
            data = {}
        return data


__all__ = ["GMOClient"]
