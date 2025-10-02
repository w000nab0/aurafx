from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings
from .models import Base

_async_engine = create_async_engine(settings.database_url, future=True, echo=False)
_async_session_factory = async_sessionmaker(_async_engine, expire_on_commit=False)


async def init_database() -> None:
    """Initialise database objects (create tables if necessary)."""
    async with _async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return _async_session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _async_session_factory() as session:
        yield session


__all__ = ["get_session", "get_session_factory", "init_database"]
