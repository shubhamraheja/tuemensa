from .base import BaseScraper
from ..models.place import Place


class MensaHungerElkScraper(BaseScraper):
    location_name = "Mensa HungerElk"

    async def scrape(self) -> list[Place]:
        # TODO: implement scraping for Mensa HungerElk
        return []
