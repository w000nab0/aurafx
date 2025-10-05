from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

from ..core.blackout import serialize_blackout_windows

logger = logging.getLogger(__name__)


@dataclass
class TradingConfigData:
    pip_size: float
    lot_size: float
    stop_loss_pips: float
    take_profit_pips: float
    fee_rate: float
    trading_active: bool = False
    trend_sma_period: int = 21
    trend_threshold_pips: float = 1.5
    atr_threshold_pips: float = 2.0
    blackout_windows: list[dict[str, str]] | None = None


class TradingConfigStore:
    """Simple JSON-backed persistence for trading configuration."""

    def __init__(self, path: Path) -> None:
        self._path = path

    def load(self) -> Optional[TradingConfigData]:
        try:
            with self._path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            payload.setdefault("trading_active", False)
            payload.setdefault("trend_sma_period", 21)
            payload.setdefault("trend_threshold_pips", 1.5)
            payload.setdefault("atr_threshold_pips", 2.0)
            payload.setdefault("blackout_windows", serialize_blackout_windows())
            return TradingConfigData(**payload)
        except FileNotFoundError:
            logger.info("Trading config file not found at %s; using defaults", self._path)
            return None
        except Exception:
            logger.exception("Failed to load trading config from %s", self._path)
            return None

    def save(self, config: TradingConfigData) -> None:
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            tmp_path = self._path.with_suffix(self._path.suffix + ".tmp")
            with tmp_path.open("w", encoding="utf-8") as handle:
                json.dump(asdict(config), handle, ensure_ascii=False, indent=2)
            tmp_path.replace(self._path)
            logger.info("Trading config persisted to %s", self._path)
        except Exception:
            logger.exception("Failed to persist trading config to %s", self._path)


__all__ = ["TradingConfigStore", "TradingConfigData"]
