"""Run all mensa scrapers and persist their results.

``scrape_all`` is called once on startup (with ``enrich=True``) and again every
Monday morning by the scheduler (menus only). Upserts match on place name and
never overwrite an existing field with an empty value, so the weekly menu
refresh preserves the Google-enriched data from startup.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import SessionLocal
from ..models.place import Place
from ..services.enrich import enrich_places
from .base import BaseScraper
from .mensa_hungryelk import HungryElkScraper
from .mensa_maxplanck import MaxPlanckHausScraper
from .openmensa import OpenMensaScraper

logger = logging.getLogger(__name__)

SCRAPERS: list[BaseScraper] = [
    OpenMensaScraper(),
    MaxPlanckHausScraper(),
    HungryElkScraper(),
]

# Fields a scraper is allowed to set; updated only when the scraped value is
# non-empty, so transient parse failures don't wipe good data.
_SCRAPER_FIELDS = [
    "location",
    "address",
    "latitude",
    "longitude",
    "place_type",
    "cuisine",
    "opening_hours",
    "menu",
    "google_types",
    "website_uri",
]


def _menu_key(item: dict) -> tuple[str, str, str]:
    """Stable identity for a scraped weekly menu item."""
    return (
        str(item.get("name", "")).strip().casefold(),
        str(item.get("day") or "").strip().casefold(),
        str(item.get("category") or "").strip().casefold(),
    )


def _preserve_menu_images(old_menu: list[dict], new_menu: list[dict]) -> list[dict]:
    """Keep generated URLs when a scraper replaces the JSON menu wholesale."""
    old_images = {
        _menu_key(item): item["image_url"]
        for item in old_menu
        if item.get("image_url")
    }
    for item in new_menu:
        image_url = old_images.get(_menu_key(item))
        if image_url and not item.get("image_url"):
            item["image_url"] = image_url
    return new_menu


async def _upsert(session: AsyncSession, places: list[Place]) -> tuple[int, int]:
    created = updated = 0
    for place in places:
        existing = await session.scalar(select(Place).where(Place.name == place.name))
        if existing is None:
            session.add(place)
            created += 1
            continue
        for field in _SCRAPER_FIELDS:
            value = getattr(place, field)
            if value:  # don't clobber existing data with None / [] / ""
                if field == "menu":
                    value = _preserve_menu_images(existing.menu or [], value)
                setattr(existing, field, value)
        updated += 1
    await session.commit()
    return created, updated


async def scrape_all(enrich: bool = False) -> dict:
    """Run all scrapers, upsert results, optionally enrich. Returns a summary."""
    per_scraper: list[dict] = []
    collected: list[Place] = []
    for scraper in SCRAPERS:
        try:
            places = await scraper.scrape()
        except Exception:  # noqa: BLE001 - one source must not break the rest
            logger.exception("Scraper %s crashed", scraper.name)
            places = []
        per_scraper.append(
            {
                "scraper": scraper.name,
                "places": len(places),
                "menu_items": sum(len(p.menu) for p in places),
            }
        )
        logger.info("Scraper %s -> %d place(s)", scraper.name, len(places))
        collected.extend(places)

    summary = {
        "scrapers": per_scraper,
        "total_places": len(collected),
        "created": 0,
        "updated": 0,
        "enriched": 0,
    }
    if not collected:
        logger.warning("No places scraped; nothing to upsert.")
        return summary

    async with SessionLocal() as session:
        created, updated = await _upsert(session, collected)
        summary["created"], summary["updated"] = created, updated
        logger.info("Scrape upsert: %d created, %d updated", created, updated)
        if enrich:
            summary["enriched"] = await enrich_places(
                session, [p.name for p in collected]
            )
            logger.info("Enriched %d scraped place(s) via Google.", summary["enriched"])

    return summary


async def main() -> None:
    from ..core.database import init_db

    await init_db()
    await scrape_all(enrich=True)


if __name__ == "__main__":
    asyncio.run(main())
