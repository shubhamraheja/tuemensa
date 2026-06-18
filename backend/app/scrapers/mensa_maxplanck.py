from .base import BaseScraper
from ..models.menu import Menu


class MensaNordScraper(BaseScraper):
    location_name = "Mensa Nord"

    async def scrape(self) -> list[Menu]:
        # TODO: implement scraping for Mensa Nord
        return []
