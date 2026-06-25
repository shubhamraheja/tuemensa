"""Enrich scraped places with Google-only data (hours, ratings, price, ids).

Runs at startup only (alongside seeding) — not on the weekly menu refresh, since
this data barely changes. Reuses the same Google Places fields as seeding.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.place import Place
from . import maps
from .seed import _PRICE_MAP, _classify, _opening_hours, _price_units

logger = logging.getLogger(__name__)


def _apply(place: Place, raw: dict) -> None:
    loc = raw.get("location") or {}
    # Only fill coordinates if the scraper didn't supply them (avoids a wrong
    # text-search match overwriting good coordinates).
    if place.latitude is None and loc.get("latitude") is not None:
        place.latitude = loc["latitude"]
        place.longitude = loc["longitude"]
    if raw.get("id"):
        place.google_place_id = raw["id"]
    if not place.address and raw.get("formattedAddress"):
        place.address = raw["formattedAddress"]
    if raw.get("rating") is not None:
        place.rating = raw["rating"]
    if raw.get("userRatingCount") is not None:
        place.user_rating_count = raw["userRatingCount"]

    price_level = raw.get("priceLevel")
    if price_level:
        place.price_level = price_level
        place.price_range = _PRICE_MAP.get(price_level) or place.price_range
    price_range = raw.get("priceRange") or {}
    if price_range.get("startPrice"):
        place.price_start = _price_units(price_range["startPrice"])
    if price_range.get("endPrice"):
        place.price_end = _price_units(price_range["endPrice"])

    # Fill opening hours only when the scraper didn't (Uni mensas have none;
    # MPH / Hungry Elk carry their own authoritative hours).
    if not place.opening_hours:
        hours = _opening_hours(raw)
        if hours:
            place.opening_hours = hours

    if raw.get("googleMapsUri"):
        place.google_maps_uri = raw["googleMapsUri"]
    if not place.website_uri and raw.get("websiteUri"):
        place.website_uri = raw["websiteUri"]
    if not place.place_type and raw.get("types"):
        place.place_type = _classify(raw["types"])
    if raw.get("types") and not place.google_types:
        place.google_types = raw["types"]


async def enrich_places(session: AsyncSession, names: list[str]) -> int:
    """Look each place up on Google by name and fill its Google-only fields.

    Never raises; if the key/billing is missing it logs once and stops.
    """
    enriched = 0
    for name in names:
        place = await session.scalar(select(Place).where(Place.name == name))
        if place is None:
            continue
        try:
            raw = await maps.search_text(f"{name} Tübingen")
        except maps.MapsError as exc:
            logger.warning("Skipping place enrichment: %s", exc)
            break
        except Exception:  # noqa: BLE001
            logger.exception("Enrichment lookup failed for %s", name)
            continue
        if not raw:
            continue
        _apply(place, raw)
        enriched += 1

    if enriched:
        await session.commit()
    return enriched
