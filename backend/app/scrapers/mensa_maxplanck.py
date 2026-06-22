from .base import BaseScraper
from ..models.place import Place


class MensaNordScraper(BaseScraper):
    location_name = "Mensa Nord"

    async def scrape(self) -> list[Place]:
        # TODO: implement scraping for Mensa Nord
        return []
