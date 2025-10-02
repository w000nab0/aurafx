from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from . import Base


class SignalRecord(Base):
    """Database record representing a signal or position event."""

    __tablename__ = "signal_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol = Column(Text, nullable=False)
    timeframe = Column(Text, nullable=False)
    direction = Column(Text, nullable=False)
    trade_action = Column(Text, nullable=False)
    strategy = Column(Text, nullable=False)
    strategy_name = Column(Text, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    price = Column(Numeric(18, 6), nullable=False)
    pnl = Column(Numeric(18, 6))
    pips = Column(Numeric(18, 6))
    payload = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return (
            "SignalRecord(id=%r, symbol=%r, strategy=%r, action=%r, occurred_at=%r)"
            % (
                self.id,
                self.symbol,
                self.strategy,
                self.trade_action,
                self.occurred_at,
            )
        )


__all__ = ["SignalRecord"]
