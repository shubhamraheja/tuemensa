import asyncio
from ..core.database import init_db
<<<<<<< HEAD
from ..models.menu import Menu
from ..models.location import Location
from .mensa_hungryelk import MensaHungerElkScraper
from .mensa_maxplanck import MensaMaxPlanckScraper, MensaNordScraper
=======
from .mensa_hungryelk import MensaSuedScraper
from .mensa_maxplanck import MensaNordScraper
>>>>>>> 7a38f914dad2ab2060532bce4763ad9fe97ede84

SCRAPERS = [
    MensaHungerElkScraper(),
    MensaMaxPlanckScraper(),
]


async def main() -> None:
    await init_db()

    for scraper in SCRAPERS:
        print(f"Scraping {scraper.location_name}...")
        places = await scraper.scrape()
        await scraper.upsert(places)
        print(f"  -> {len(places)} places upserted")


if __name__ == "__main__":
    asyncio.run(main())
