from __future__ import annotations

from functools import lru_cache
from typing import Any, List

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
    gmo_private_base_url: str = "https://forex-api.coin.z.com"
    indicator_config: dict[str, Any] = {
        "sma_periods": [5, 21],
        "rsi_periods": [14],
        "rci_periods": [6, 9, 27],
        "bb_period": 21,
        "bb_sigmas": [2.0, 3.0],
        "trend_window": 10,
        "trend_threshold_pips": 1.5,
        "max_rows": 1000,
        "trend_method": "regression",
    }
    position_config: dict[str, float | int] = {
        "pip_size": 0.001,
        "lot_size": 100,
        "stop_loss_pips": 20,
        "take_profit_pips": 40,
        "fee_rate": 0.00002,
    }
    signal_cooldown_sec: int = 30
    trading_config_path: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


settings = get_settings()
