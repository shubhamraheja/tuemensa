from .base import BaseScraper
from ..models.place import Place


class MensaSuedScraper(BaseScraper):
    location_name = "Mensa Süd"

    async def scrape(self) -> list[Place]:
        # TODO: implement scraping for Mensa Süd
        return []
