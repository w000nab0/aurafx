from __future__ import annotations

from decimal import Decimal
from typing import Iterable, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..core.signals import STRATEGY_LABELS, SignalEvent
from ..models.signal import SignalRecord


def _to_decimal(value: float | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


class SignalRepository:
    """Persistence layer for signal and position events."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def add_events(self, events: Sequence[SignalEvent]) -> None:
        if not events:
            return
        records = [
            SignalRecord(
                symbol=event.symbol,
                timeframe=event.timeframe,
                direction=event.direction,
                trade_action=event.trade_action or "NONE",
                strategy=event.strategy.value,
                strategy_name=STRATEGY_LABELS[event.strategy],
                occurred_at=event.occurred_at,
                price=_to_decimal(event.price),
                pnl=_to_decimal(event.pnl),
                pips=_to_decimal(event.pips),
                payload=event.as_dict(),
            )
            for event in events
        ]
        async with self._session_factory() as session:
            session.add_all(records)
            await session.commit()

    async def get_recent_events(self, limit: int = 100) -> list[dict[str, object]]:
        stmt = (
            select(SignalRecord)
            .order_by(SignalRecord.occurred_at.desc(), SignalRecord.id.desc())
            .limit(limit)
        )
        async with self._session_factory() as session:
            result = await session.execute(stmt)
            rows = result.scalars().all()
        payloads: list[dict[str, object]] = []
        for row in rows:
            record = dict(row.payload)
            if row.pnl is not None:
                record["pnl"] = _to_float(row.pnl)
            if row.pips is not None:
                record["pips"] = _to_float(row.pips)
            payloads.append(record)
        return payloads


def _to_float(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


__all__ = ["SignalRepository"]
