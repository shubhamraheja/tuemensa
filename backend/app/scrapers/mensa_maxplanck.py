from .base import BaseScraper
from ..models.menu import Menu


class MensaMaxPlanckScraper(BaseScraper):
    location_name = "Mensa Max Planck"

    async def scrape(self) -> list[Menu]:
        # TODO: implement scraping for Mensa Max Planck
        return []
