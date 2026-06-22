import asyncio
from ..core.database import init_db
from ..models.menu import Menu
from ..models.location import Location
from .mensa_hungryelk import MensaHungerElkScraper
from .mensa_maxplanck import MensaMaxPlanckScraper, MensaNordScraper

SCRAPERS = [
    MensaHungerElkScraper(),
    MensaMaxPlanckScraper(),
]


async def main() -> None:
    await init_db([Menu, Location])

    for scraper in SCRAPERS:
        print(f"Scraping {scraper.location_name}...")
        menus = await scraper.scrape()
        await scraper.upsert(menus)
        print(f"  -> {len(menus)} menus upserted")


if __name__ == "__main__":
    asyncio.run(main())
