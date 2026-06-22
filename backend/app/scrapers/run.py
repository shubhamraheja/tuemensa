import asyncio
from ..core.database import init_db
from .mensa_hungryelk import MensaHungerElkScraper
from .mensa_maxplanck import MensaMaxPlanckScraper

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
