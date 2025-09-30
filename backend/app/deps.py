from __future__ import annotations

from typing import Optional

from .services.broadcast import BroadcastHub
from .services.positions import PositionManager

position_manager: Optional[PositionManager] = None
broadcast_hub: Optional[BroadcastHub] = None


def get_position_manager() -> PositionManager:
    if position_manager is None:
        raise RuntimeError("PositionManager is not initialized")
    return position_manager


def get_broadcast_hub() -> BroadcastHub:
    if broadcast_hub is None:
        raise RuntimeError("BroadcastHub is not initialized")
    return broadcast_hub
