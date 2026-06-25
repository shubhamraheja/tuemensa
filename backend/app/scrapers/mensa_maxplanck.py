from .base import BaseScraper
from ..models.place import Place


class MensaMaxPlanckScraper(BaseScraper):
    location_name = "Mensa Max Planck"

    async def scrape(self) -> list[Place]:
        # TODO: implement scraping for Mensa Max Planck
        return []
