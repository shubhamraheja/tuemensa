import math

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.database import get_db
from ...models.place import MealType, Place, PriceTier
from ...schemas.place import (
    NearbySearchResponse,
    NearbySearchResult,
    PlaceCreate,
    PlaceRead,
    PlaceUpdate,
)

router = APIRouter(prefix="/places", tags=["places"])

GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby"
GOOGLE_FIELD_MASK = ",".join([
    "places.id",
    "places.currentOpeningHours.openNow",
])

PRICE_LEVEL_MAP = {
    "PRICE_LEVEL_FREE": PriceTier.UNDER_5,
    "PRICE_LEVEL_INEXPENSIVE": PriceTier.UNDER_5,
    "PRICE_LEVEL_MODERATE": PriceTier.FIVE_TO_TEN,
    "PRICE_LEVEL_EXPENSIVE": PriceTier.OVER_TEN,
    "PRICE_LEVEL_VERY_EXPENSIVE": PriceTier.OVER_TEN,
}

MEAL_GOOGLE_TYPES = {"restaurant", "meal_takeaway", "meal_delivery"}
SNACK_GOOGLE_TYPES = {"cafe", "bakery", "coffee_shop", "ice_cream_shop"}


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _infer_meal_type(types: list[str]) -> MealType | None:
    type_set = set(types)
    if type_set & MEAL_GOOGLE_TYPES:
        return MealType.MEAL
    if type_set & SNACK_GOOGLE_TYPES:
        return MealType.SNACK
    return None


@router.get("/nearby-food", response_model=NearbySearchResponse)
async def get_nearby_food(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius: int = Query(1200, ge=100, le=5000),
    max_results: int = Query(20, ge=1, le=20),
    meal_type: MealType | None = Query(None),
    price_tier: PriceTier | None = Query(None),
    is_vegan_friendly: bool | None = Query(None),
    is_vegetarian_friendly: bool | None = Query(None),
    allergens_exclude: list[str] = Query(default=[]),
    db: AsyncSession = Depends(get_db),
):
    if not settings.google_maps_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_MAPS_API_KEY is not configured",
        )

    # Step 1: Ask Google for nearby place IDs + live open_now status
    payload = {
        "includedTypes": ["restaurant", "cafe", "bakery", "meal_takeaway"],
        "maxResultCount": max_results,
        "rankPreference": "POPULARITY",
        "locationRestriction": {
            "circle": {
                "center": {"latitude": float(latitude), "longitude": float(longitude)},
                "radius": float(radius),
            }
        },
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(GOOGLE_PLACES_URL, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not reach Google Places") from exc

    google_results = response.json().get("places", [])
    open_now_by_gid = {
        p["id"]: p.get("currentOpeningHours", {}).get("openNow")
        for p in google_results
        if "id" in p
    }
    nearby_gids = list(open_now_by_gid.keys())

    if not nearby_gids:
        return {"places": []}

    # Step 2: Fetch enriched records from DB for these place IDs
    query = select(Place).where(
        Place.google_place_id.in_(nearby_gids),
        Place.ignore.is_(False),
    )
    if meal_type is not None:
        query = query.where(Place.meal_type == meal_type)
    if price_tier is not None:
        query = query.where(Place.price_tier == price_tier)
    if is_vegan_friendly is not None:
        query = query.where(Place.is_vegan_friendly == is_vegan_friendly)
    if is_vegetarian_friendly is not None:
        query = query.where(Place.is_vegetarian_friendly == is_vegetarian_friendly)

    db_places = list(await db.scalars(query))

    # Filter allergen exclusions in Python (JSON column)
    if allergens_exclude:
        exclude_set = {a.lower() for a in allergens_exclude}
        db_places = [
            p for p in db_places
            if not (p.allergens and exclude_set & {a.lower() for a in p.allergens})
        ]

    # Step 3: For nearby IDs not yet in DB, insert minimal stubs
    db_gids = {p.google_place_id for p in db_places}
    missing_gids = set(nearby_gids) - db_gids

    # Only insert stubs when no filters are active (stubs have no enrichment data)
    if missing_gids and not any([meal_type, price_tier, is_vegan_friendly, is_vegetarian_friendly, allergens_exclude]):
        # Re-fetch full data for stubs — need coordinates and name
        full_mask = ",".join([
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.types",
            "places.googleMapsUri",
            "places.websiteUri",
        ])
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                full_resp = await client.post(
                    GOOGLE_PLACES_URL,
                    json=payload,
                    headers={**headers, "X-Goog-FieldMask": full_mask},
                )
                full_resp.raise_for_status()
            full_results = {p["id"]: p for p in full_resp.json().get("places", []) if "id" in p}
        except httpx.HTTPError:
            full_results = {}

        new_stubs: list[Place] = []
        for gid in missing_gids:
            raw = full_results.get(gid)
            if not raw:
                continue
            loc = raw.get("location", {})
            stub = Place(
                google_place_id=gid,
                name=raw.get("displayName", {}).get("text", "Unnamed"),
                address=raw.get("formattedAddress"),
                latitude=loc.get("latitude"),
                longitude=loc.get("longitude"),
                rating=raw.get("rating"),
                user_rating_count=raw.get("userRatingCount"),
                google_maps_uri=raw.get("googleMapsUri"),
                website_uri=raw.get("websiteUri"),
                meal_type=_infer_meal_type(raw.get("types", [])),
                price_tier=PRICE_LEVEL_MAP.get(raw.get("priceLevel", "")),
                menu=[],
                opening_hours=[],
            )
            db.add(stub)
            new_stubs.append(stub)

        if new_stubs:
            await db.commit()
            for stub in new_stubs:
                await db.refresh(stub)
            db_places.extend(new_stubs)

    # Step 4: Build response ordered by Google's popularity ranking
    gid_order = {gid: i for i, gid in enumerate(nearby_gids)}
    db_places.sort(key=lambda p: gid_order.get(p.google_place_id, 999))

    results: list[NearbySearchResult] = []
    for place in db_places:
        distance = None
        if place.latitude is not None and place.longitude is not None:
            distance = _haversine_m(latitude, longitude, place.latitude, place.longitude)

        results.append(NearbySearchResult(
            id=place.id,
            google_place_id=place.google_place_id,
            name=place.name,
            address=place.address,
            latitude=place.latitude,
            longitude=place.longitude,
            rating=place.rating,
            user_rating_count=place.user_rating_count,
            price_tier=place.price_tier,
            meal_type=place.meal_type,
            cuisine=place.cuisine,
            is_vegan_friendly=place.is_vegan_friendly,
            is_vegetarian_friendly=place.is_vegetarian_friendly,
            allergens=place.allergens,
            menu=[m if isinstance(m, dict) else m for m in (place.menu or [])],
            opening_hours=[h if isinstance(h, dict) else h for h in (place.opening_hours or [])],
            google_maps_uri=place.google_maps_uri,
            website_uri=place.website_uri,
            open_now=open_now_by_gid.get(place.google_place_id),
            distance_m=distance,
        ))

    return {"places": results}


@router.get("/", response_model=list[PlaceRead])
async def get_places(
    meal_type: MealType | None = None,
    price_tier: PriceTier | None = None,
    is_vegan_friendly: bool | None = None,
    is_vegetarian_friendly: bool | None = None,
    include_ignored: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(Place)
    if not include_ignored:
        query = query.where(Place.ignore.is_(False))
    if meal_type is not None:
        query = query.where(Place.meal_type == meal_type)
    if price_tier is not None:
        query = query.where(Place.price_tier == price_tier)
    if is_vegan_friendly is not None:
        query = query.where(Place.is_vegan_friendly == is_vegan_friendly)
    if is_vegetarian_friendly is not None:
        query = query.where(Place.is_vegetarian_friendly == is_vegetarian_friendly)
    result = await db.scalars(query.order_by(Place.name))
    return result.all()


@router.get("/{place_id}", response_model=PlaceRead)
async def get_place(place_id: int, db: AsyncSession = Depends(get_db)):
    place = await db.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


@router.post("/", response_model=PlaceRead, status_code=status.HTTP_201_CREATED)
async def create_place(body: PlaceCreate, db: AsyncSession = Depends(get_db)):
    place = Place(**body.model_dump())
    db.add(place)
    await db.commit()
    await db.refresh(place)
    return place


@router.put("/{place_id}", response_model=PlaceRead)
async def update_place(place_id: int, body: PlaceUpdate, db: AsyncSession = Depends(get_db)):
    place = await db.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(place, field, value)
    await db.commit()
    await db.refresh(place)
    return place


@router.delete("/{place_id}")
async def delete_place(place_id: int, db: AsyncSession = Depends(get_db)):
    place = await db.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    await db.delete(place)
    await db.commit()
    return {"success": True, "message": "Place deleted"}
