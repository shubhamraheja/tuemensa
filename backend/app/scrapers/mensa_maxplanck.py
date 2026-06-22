from .base import BaseScraper
from ..models.place import Place


class MensaMaxPlanckScraper(BaseScraper):
    location_name = "Mensa Max Planck"

<<<<<<< HEAD
    async def scrape(self) -> list[Menu]:
        # TODO: implement scraping for Mensa Max Planck
=======
    async def scrape(self) -> list[Place]:
        # TODO: implement scraping for Mensa Nord
>>>>>>> 7a38f914dad2ab2060532bce4763ad9fe97ede84
        return []
