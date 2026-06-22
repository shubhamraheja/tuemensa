from .base import BaseScraper
from ..models.place import Place


class MensaHungerElkScraper(BaseScraper):
    location_name = "Mensa HungerElk"

<<<<<<< HEAD
    async def scrape(self) -> list[Menu]:
        # TODO: implement scraping for Mensa HungerElk
=======
    async def scrape(self) -> list[Place]:
        # TODO: implement scraping for Mensa Süd
>>>>>>> 7a38f914dad2ab2060532bce4763ad9fe97ede84
        return []
