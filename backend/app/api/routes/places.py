import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.database import get_db
from ...models.place import Place, PlaceType
from ...schemas.place import NearbyFoodResponse, PlaceCreate, PlaceRead, PlaceUpdate

router = APIRouter(prefix="/places", tags=["places"])

GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby"
GOOGLE_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.currentOpeningHours.openNow",
        "places.types",
        "places.googleMapsUri",
        "places.websiteUri",
    ]
)


@router.get("/nearby-food", response_model=NearbyFoodResponse)
async def get_nearby_food(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius: int = Query(1200, ge=100, le=5000),
    max_results: int = Query(15, ge=1, le=20),
):
    if not settings.google_maps_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_MAPS_API_KEY is not configured",
        )

    payload = {
        "includedTypes": ["restaurant", "cafe", "bakery", "meal_takeaway"],
        "maxResultCount": max_results,
        "rankPreference": "DISTANCE",
        "locationRestriction": {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": radius,
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
        detail = exc.response.text or "Google Places request failed"
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Google Places",
        ) from exc

    return {
        "places": [
            {
                "id": place["id"],
                "name": place.get("displayName", {}).get("text", "Unnamed place"),
                "address": place.get("formattedAddress"),
                "location": place["location"],
                "rating": place.get("rating"),
                "user_rating_count": place.get("userRatingCount"),
                "price_level": place.get("priceLevel"),
                "open_now": place.get("currentOpeningHours", {}).get("openNow"),
                "types": place.get("types", []),
                "google_maps_uri": place.get("googleMapsUri"),
                "website_uri": place.get("websiteUri"),
            }
            for place in response.json().get("places", [])
            if "id" in place and "location" in place
        ]
    }


@router.get("/", response_model=list[PlaceRead])
async def get_places(
    location: str | None = None,
    place_type: PlaceType | None = None,
    include_ignored: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(Place)
    if location:
        query = query.where(Place.location == location)
    if place_type:
        query = query.where(Place.place_type == place_type)
    if not include_ignored:
        query = query.where(Place.ignore.is_(False))
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
async def update_place(
    place_id: int, body: PlaceUpdate, db: AsyncSession = Depends(get_db)
):
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
