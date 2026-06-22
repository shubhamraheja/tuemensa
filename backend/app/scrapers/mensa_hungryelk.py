from .base import BaseScraper
from ..models.menu import Menu


class MensaHungerElkScraper(BaseScraper):
    location_name = "Mensa HungerElk"

    async def scrape(self) -> list[Menu]:
        # TODO: implement scraping for Mensa HungerElk
        return []
