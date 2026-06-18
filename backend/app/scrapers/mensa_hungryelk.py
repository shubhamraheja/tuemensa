from .base import BaseScraper
from ..models.menu import Menu


class MensaSuedScraper(BaseScraper):
    location_name = "Mensa Süd"

    async def scrape(self) -> list[Menu]:
        # TODO: implement scraping for Mensa Süd
        return []
