from abc import ABC, abstractmethod

from sqlalchemy import select

from ..core.database import SessionLocal
from ..models.place import Place


class BaseScraper(ABC):
    location_name: str

    @abstractmethod
    async def scrape(self) -> list[Place]:
        """Scrape and return a list of Place objects (not yet persisted)."""
        ...

    async def upsert(self, places: list[Place]) -> None:
        async with SessionLocal() as session:
            for place in places:
                existing = await session.scalar(
                    select(Place).where(
                        Place.name == place.name,
                        Place.location == place.location,
                    )
                )
                if existing:
                    existing.menu = place.menu
                    existing.opening_hours = place.opening_hours
                else:
                    session.add(place)
            await session.commit()
