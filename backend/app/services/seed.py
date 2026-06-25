"""Seed the database with Tübingen food places (Call 1).

Runs once on first boot when the ``places`` table is empty. Maps raw Google
results onto the :class:`Place` data model and persists them, so everything
downstream reads from the DB rather than calling Google again.
"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.place import Place, PlaceType, PriceRange
from . import maps

logger = logging.getLogger(__name__)

# Google place type -> our PlaceType enum, in priority order.
_TYPE_PRIORITY: list[tuple[str, PlaceType]] = [
    ("bakery", PlaceType.BAKERY),
    ("cafe", PlaceType.CAFE),
    ("meal_takeaway", PlaceType.BISTRO),
    ("restaurant", PlaceType.RESTAURANT),
]

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


def _to_place(raw: dict) -> Place:
    types = raw.get("types", [])
    loc = raw.get("location", {})
    price_level = raw.get("priceLevel")
    price_range = raw.get("priceRange") or {}
    return Place(
        google_place_id=raw["id"],
        name=raw.get("displayName", {}).get("text", "Unnamed place"),
        location="Tübingen",
        address=raw.get("formattedAddress"),
        latitude=loc.get("latitude"),
        longitude=loc.get("longitude"),
        place_type=_classify(types),
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
        session.add(_to_place(raw))
        existing_ids.add(raw["id"])
        inserted += 1

    await session.commit()
    return inserted


async def seed_places_if_empty(session: AsyncSession) -> int:
    """Seed only when the table is empty and an API key is configured.

    Safe to call on every startup; returns the number of rows inserted (0 when
    skipped). Never raises — a seeding failure must not block app startup.
    """
    count = await session.scalar(select(func.count()).select_from(Place))
    if count:
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
