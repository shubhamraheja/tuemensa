import asyncio
from ..core.database import init_db
from .mensa_hungryelk import MensaSuedScraper
from .mensa_maxplanck import MensaNordScraper

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
