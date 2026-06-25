"""Seed the places table with food spots in Tübingen from Google Places API.

Run with:
    python -m app.scrapers.seed_tuebingen

Uses a 3×3 grid of sub-centers across Tübingen (each with 2km radius) to work
around Google's 20-result-per-call cap and ensure full city coverage.
"""

import asyncio
import math

import httpx
from sqlalchemy import select

from ..core.config import settings
from ..core.database import SessionLocal, init_db
from ..models.place import MealType, Place, PriceTier

GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby"
GOOGLE_FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.currentOpeningHours.weekdayDescriptions",
    "places.types",
    "places.googleMapsUri",
    "places.websiteUri",
])

# 3×3 grid covering central Tübingen; radius 2000m per cell
_LAT_CENTER = 48.5216
_LNG_CENTER = 9.0576
_GRID_OFFSETS_DEG = [-0.012, 0.0, 0.012]  # ~1.3km steps

GRID_CENTERS = [
    (_LAT_CENTER + dlat, _LNG_CENTER + dlng)
    for dlat in _GRID_OFFSETS_DEG
    for dlng in _GRID_OFFSETS_DEG
]

INCLUDED_TYPES = ["restaurant", "cafe", "bakery", "meal_takeaway"]

MEAL_GOOGLE_TYPES = {"restaurant", "meal_takeaway", "meal_delivery", "meal_kit_delivery_service"}
SNACK_GOOGLE_TYPES = {"cafe", "bakery", "coffee_shop", "ice_cream_shop", "dessert_shop"}

PRICE_LEVEL_MAP = {
    "PRICE_LEVEL_FREE": PriceTier.UNDER_5,
    "PRICE_LEVEL_INEXPENSIVE": PriceTier.UNDER_5,
    "PRICE_LEVEL_MODERATE": PriceTier.FIVE_TO_TEN,
    "PRICE_LEVEL_EXPENSIVE": PriceTier.OVER_TEN,
    "PRICE_LEVEL_VERY_EXPENSIVE": PriceTier.OVER_TEN,
}


def _infer_meal_type(types: list[str]) -> MealType | None:
    type_set = set(types)
    if type_set & MEAL_GOOGLE_TYPES:
        return MealType.MEAL
    if type_set & SNACK_GOOGLE_TYPES:
        return MealType.SNACK
    return None


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _fetch_places(client: httpx.AsyncClient, lat: float, lng: float) -> list[dict]:
    payload = {
        "includedTypes": INCLUDED_TYPES,
        "maxResultCount": 20,
        "rankPreference": "POPULARITY",
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 2000.0,
            }
        },
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    }
    response = await client.post(GOOGLE_PLACES_URL, json=payload, headers=headers, timeout=15)
    response.raise_for_status()
    return response.json().get("places", [])


async def seed() -> None:
    if not settings.google_maps_api_key:
        raise RuntimeError("GOOGLE_MAPS_API_KEY is not set")

    await init_db()

    seen_ids: set[str] = set()
    all_places: list[dict] = []

    async with httpx.AsyncClient() as client:
        for lat, lng in GRID_CENTERS:
            try:
                results = await _fetch_places(client, lat, lng)
            except httpx.HTTPError as exc:
                print(f"  [warn] Grid cell ({lat:.4f}, {lng:.4f}) failed: {exc}")
                continue

            new = [p for p in results if p.get("id") and p["id"] not in seen_ids]
            seen_ids.update(p["id"] for p in new)
            all_places.extend(new)
            print(f"  Grid ({lat:.4f}, {lng:.4f}): {len(results)} results, {len(new)} new")

    print(f"\nTotal unique places fetched: {len(all_places)}")

    async with SessionLocal() as session:
        upserted = 0
        inserted = 0

        for raw in all_places:
            gid = raw.get("id")
            if not gid:
                continue

            loc = raw.get("location", {})
            lat = loc.get("latitude")
            lng = loc.get("longitude")
            types = raw.get("types", [])
            hours_raw = (
                raw.get("currentOpeningHours", {}).get("weekdayDescriptions") or []
            )
            opening_hours = [{"description": h} for h in hours_raw]

            existing = await session.scalar(
                select(Place).where(Place.google_place_id == gid)
            )

            if existing:
                # Refresh fields that may have changed
                existing.name = raw.get("displayName", {}).get("text", existing.name)
                existing.address = raw.get("formattedAddress", existing.address)
                existing.latitude = lat if lat is not None else existing.latitude
                existing.longitude = lng if lng is not None else existing.longitude
                existing.rating = raw.get("rating", existing.rating)
                existing.user_rating_count = raw.get("userRatingCount", existing.user_rating_count)
                existing.google_maps_uri = raw.get("googleMapsUri", existing.google_maps_uri)
                existing.website_uri = raw.get("websiteUri", existing.website_uri)
                if opening_hours:
                    existing.opening_hours = opening_hours
                # Don't overwrite manually set price_tier / meal_type if already set
                if existing.price_tier is None:
                    existing.price_tier = PRICE_LEVEL_MAP.get(raw.get("priceLevel", ""))
                if existing.meal_type is None:
                    existing.meal_type = _infer_meal_type(types)
                upserted += 1
            else:
                place = Place(
                    google_place_id=gid,
                    name=raw.get("displayName", {}).get("text", "Unnamed"),
                    address=raw.get("formattedAddress"),
                    latitude=lat,
                    longitude=lng,
                    rating=raw.get("rating"),
                    user_rating_count=raw.get("userRatingCount"),
                    google_maps_uri=raw.get("googleMapsUri"),
                    website_uri=raw.get("websiteUri"),
                    meal_type=_infer_meal_type(types),
                    price_tier=PRICE_LEVEL_MAP.get(raw.get("priceLevel", "")),
                    opening_hours=opening_hours,
                    menu=[],
                )
                session.add(place)
                inserted += 1

        await session.commit()

    print(f"Done — {inserted} inserted, {upserted} updated.")


if __name__ == "__main__":
    asyncio.run(seed())
