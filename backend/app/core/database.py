from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Base class all ORM models inherit from."""


engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    """Create tables for all registered models. Call once on startup."""
    # Import models so they register themselves on Base.metadata.
    from ..models import place  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if conn.dialect.name == "postgresql":
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255)")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS address VARCHAR(512)")
            )
            await conn.execute(
                text(
                    "ALTER TABLE places ADD COLUMN IF NOT EXISTS google_types JSON "
                    "NOT NULL DEFAULT '[]'::json"
                )
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS price_level VARCHAR(64)")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS price_start INTEGER")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS price_end INTEGER")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS user_rating_count INTEGER")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS google_maps_uri VARCHAR(512)")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS website_uri VARCHAR(512)")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS photo_name VARCHAR(512)")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS photo_attributions JSON")
            )
            await conn.execute(
                text("ALTER TABLE places ADD COLUMN IF NOT EXISTS photo_cache_file VARCHAR(512)")
            )
            await conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_places_google_place_id "
                    "ON places (google_place_id)"
                )
            )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session per request."""
    async with SessionLocal() as session:
        yield session
