from abc import ABC, abstractmethod
from ..models.menu import Menu, MenuItem


class BaseScraper(ABC):
    location_name: str

    @abstractmethod
    async def scrape(self) -> list[Menu]:
        """Scrape and return a list of Menu documents (not yet inserted)."""
        ...

    async def upsert(self, menus: list[Menu]) -> None:
        for menu in menus:
            existing = await Menu.find_one(
                Menu.date == menu.date,
                Menu.location == menu.location,
            )
            if existing:
                await existing.set({"items": menu.items})
            else:
                await menu.insert()
