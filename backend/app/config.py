from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", env_prefix="")

    app_name: str = "aurafx-backend"
    log_level: str = "INFO"
    database_url: str
    gmo_symbols: List[str] = ["USD_JPY"]
    gmo_api_key: str | None = None
    gmo_api_secret: str | None = None
    websocket_endpoint: str = "wss://forex-api.coin.z.com/ws/public/v1"
    indicator_config: dict[str, float | int] = {
        "sma_period": 20,
        "rsi_period": 14,
        "bb_period": 20,
        "bb_sigma": 2.0,
        "max_rows": 1000,
    }
    signal_cooldown_sec: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
