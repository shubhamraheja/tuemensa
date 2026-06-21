from collections.abc import AsyncGenerator, Sequence

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Base class all ORM models inherit from."""


engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db(document_models: Sequence[type] | None = None) -> None:
    """Create tables for all registered models. Call once on startup."""
    if document_models is not None:
        # The current routes/models use Beanie documents, while local development
        # is configured with PostgreSQL. Do not block app startup for endpoints
        # that do not need the local database, such as Google Places lookup.
        return

    # Import models so they register themselves on Base.metadata.
    from ..models import location, menu  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session per request."""
    async with SessionLocal() as session:
        yield session
