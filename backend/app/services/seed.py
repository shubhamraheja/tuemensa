"""Seed the database with Tübingen food places (Call 1).

Runs once on first boot when the ``places`` table is empty. Maps raw Google
results onto the :class:`Place` data model and persists them, so everything
downstream reads from the DB rather than calling Google again.
"""

from __future__ import annotations

import logging

import hashlib
from pathlib import Path

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.place import Place, PlaceType, PriceRange
from . import maps

logger = logging.getLogger(__name__)
PHOTO_CACHE_DIR = Path(__file__).resolve().parents[2] / "uploads" / "photos"
PHOTO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Google place type -> our PlaceType enum, in priority order.
_TYPE_PRIORITY: list[tuple[str, PlaceType]] = [
    ("bakery", PlaceType.BAKERY),
    ("cafe", PlaceType.CAFE),
    ("meal_takeaway", PlaceType.BISTRO),
    ("restaurant", PlaceType.RESTAURANT),
]

# Google cuisine-specific place types -> clean cuisine label.
_CUISINE_MAP: dict[str, str] = {
    "turkish_restaurant": "Turkish",
    "italian_restaurant": "Italian",
    "indian_restaurant": "Indian",
    "german_restaurant": "German",
    "chinese_restaurant": "Chinese",
    "japanese_restaurant": "Japanese",
    "asian_restaurant": "Asian",
    "thai_restaurant": "Thai",
    "vietnamese_restaurant": "Vietnamese",
    "greek_restaurant": "Greek",
    "american_restaurant": "American",
    "mexican_restaurant": "Mexican",
    "french_restaurant": "French",
    "mediterranean_restaurant": "Mediterranean",
    "middle_eastern_restaurant": "Middle Eastern",
    "lebanese_restaurant": "Lebanese",
    "korean_restaurant": "Korean",
    "sushi_restaurant": "Japanese",
    "pizza_restaurant": "Italian",
    "kebab_shop": "Turkish",
    "falafel_restaurant": "Middle Eastern",
    "ramen_restaurant": "Japanese",
    "spanish_restaurant": "Spanish",
}


# Google priceLevel -> our PriceRange enum.
_PRICE_MAP: dict[str, PriceRange] = {
    "PRICE_LEVEL_FREE": PriceRange.LOW,
    "PRICE_LEVEL_INEXPENSIVE": PriceRange.LOW,
    "PRICE_LEVEL_MODERATE": PriceRange.MEDIUM,
    "PRICE_LEVEL_EXPENSIVE": PriceRange.HIGH,
    "PRICE_LEVEL_VERY_EXPENSIVE": PriceRange.PREMIUM,
}


# Google weekday index (0 = Sunday) -> short label and Monday-first sort order.
_DAY_LABEL = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}
_DAY_ORDER = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6}


def _cuisine(types: list[str]) -> str | None:
    for google_type in types:
        label = _CUISINE_MAP.get(google_type)
        if label:
            return label
    return None


def _classify(types: list[str]) -> PlaceType | None:
    for google_type, place_type in _TYPE_PRIORITY:
        if google_type in types:
            return place_type
    return None


def _hm(point: dict) -> str:
    return f"{point.get('hour', 0):02d}:{point.get('minute', 0):02d}"


def _opening_hours(raw: dict) -> list[dict]:
    """Map Google ``regularOpeningHours.periods`` -> ``[{day, open, close}]``.

    Sorted Monday-first. Multi-period days (e.g. lunch + dinner) yield multiple
    rows; 24h spans (open with no close) are labelled "24h"; closed days are
    omitted (Google leaves them out of ``periods``).
    """
    periods = raw.get("regularOpeningHours", {}).get("periods", [])
    rows: list[tuple[tuple, dict]] = []
    for period in periods:
        opens = period.get("open")
        if not opens:
            continue
        day = opens.get("day", 0)
        closes = period.get("close")
        rows.append(
            (
                (_DAY_ORDER.get(day, 7), opens.get("hour", 0), opens.get("minute", 0)),
                {
                    "day": _DAY_LABEL.get(day, "?"),
                    "open": _hm(opens),
                    "close": _hm(closes) if closes else "24h",
                },
            )
        )
    rows.sort(key=lambda row: row[0])
    return [row[1] for row in rows]


def _price_units(money: dict | None) -> int | None:
    """Google money ``units`` arrives as a string of euros, e.g. "10"."""
    if not money:
        return None
    units = money.get("units")
    return int(units) if units is not None else None


def _photo_fields(raw: dict) -> tuple[str | None, list[str]]:
    photos = raw.get("photos") or []
    if not photos:
        return None, []
    first = photos[0]
    attributions = [
        attribution["displayName"]
        for attribution in first.get("authorAttributions", [])
        if attribution.get("displayName")
    ]
    return first.get("name"), attributions


async def _cache_photo(place: Place, photo_name: str | None) -> bool:
    if not photo_name:
        return False

    try:
        uri = await maps.photo_uri(photo_name, max_width_px=1200)
    except maps.MapsError:
        return False

    hash_value = hashlib.sha1(photo_name.encode("utf-8")).hexdigest()[:16]
    cache_path = PHOTO_CACHE_DIR / f"{place.id or 'place'}-{hash_value}.jpg"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(uri)
            response.raise_for_status()
            cache_path.write_bytes(response.content)
    except Exception:  # noqa: BLE001
        if cache_path.exists():
            cache_path.unlink(missing_ok=True)
        return False

    place.photo_cache_file = cache_path.name
    return True


def _apply_photo_fields(place: Place, raw: dict) -> bool:
    photo_name, photo_attributions = _photo_fields(raw)
    if not photo_name:
        return False
    place.photo_name = photo_name
    place.photo_attributions = photo_attributions
    return True


def _to_place(raw: dict) -> Place:
    types = raw.get("types", [])
    loc = raw.get("location", {})
    price_level = raw.get("priceLevel")
    price_range = raw.get("priceRange") or {}
    photo_name, photo_attributions = _photo_fields(raw)
    name = raw.get("displayName", {}).get("text", "Unnamed place")
    return Place(
        google_place_id=raw["id"],
        name=name,
        location="Tübingen",
        address=raw.get("formattedAddress"),
        latitude=loc.get("latitude"),
        longitude=loc.get("longitude"),
        place_type=_classify(types),
        cuisine=_cuisine(types),
        google_types=types,
        opening_hours=_opening_hours(raw),
        price_level=price_level,
        price_range=_PRICE_MAP.get(price_level) if price_level else None,
        price_start=_price_units(price_range.get("startPrice")),
        price_end=_price_units(price_range.get("endPrice")),
        rating=raw.get("rating"),
        user_rating_count=raw.get("userRatingCount"),
        google_maps_uri=raw.get("googleMapsUri"),
        website_uri=raw.get("websiteUri"),
        photo_name=photo_name,
        photo_attributions=photo_attributions,
    )


async def seed_places(session: AsyncSession) -> int:
    """Fetch Tübingen food places from Google and insert any new ones.

    Idempotent: places already present (matched by ``google_place_id``) are
    skipped. Returns the number of newly inserted rows.
    """
    raw_places = await maps.search_food_places()
    if not raw_places:
        return 0

    existing_ids = set(
        (await session.scalars(select(Place.google_place_id))).all()
    )

    inserted = 0
    for raw in raw_places:
        if raw["id"] in existing_ids:
            continue
        place = _to_place(raw)
        session.add(place)
        await session.flush()
        if place.photo_name and not place.photo_cache_file:
            await _cache_photo(place, place.photo_name)
        existing_ids.add(raw["id"])
        inserted += 1

    await session.commit()
    return inserted


async def refresh_missing_place_photos(session: AsyncSession) -> int:
    """Backfill photo metadata for existing DB rows with a Google place id."""
    places = (
        await session.scalars(
            select(Place)
            .where(Place.google_place_id.is_not(None))
            .where(Place.photo_name.is_(None))
        )
    ).all()
    if not places:
        return 0

    updated = 0
    for place in places:
        try:
            raw = await maps.place_photo_details(place.google_place_id)
        except maps.MapsError as exc:
            logger.warning("Skipping photo backfill for %s: %s", place.name, exc)
            continue
        except Exception:  # noqa: BLE001
            logger.exception("Photo backfill failed for %s", place.name)
            continue
        if raw and _apply_photo_fields(place, raw):
            if await _cache_photo(place, place.photo_name):
                updated += 1
            else:
                updated += 1

    if updated:
        await session.commit()
    return updated


async def seed_places_if_empty(session: AsyncSession) -> int:
    """Seed only when the table is empty and an API key is configured.

    Safe to call on every startup; returns the number of rows inserted (0 when
    skipped). Never raises — a seeding failure must not block app startup.
    """
    count = await session.scalar(select(func.count()).select_from(Place))
    if count:
        try:
            updated = await refresh_missing_place_photos(session)
            if updated:
                logger.info("Backfilled photos for %s existing places.", updated)
        except maps.MapsError as exc:
            logger.warning("Skipping photo backfill: %s", exc)
        logger.info("Places table already populated (%s rows); skipping seed.", count)
        return 0

    try:
        inserted = await seed_places(session)
        logger.info("Seeded %s Tübingen places from Google.", inserted)
        return inserted
    except maps.MapsError as exc:
        logger.warning("Skipping seed: %s", exc)
        return 0
    except Exception:  # noqa: BLE001 - never let seeding crash startup
        logger.exception("Unexpected error while seeding places.")
        return 0
