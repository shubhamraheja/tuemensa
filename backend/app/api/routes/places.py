import hashlib
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.database import get_db
from ...models.place import Place, PlaceType
from ...schemas.place import (
    PlaceCreate,
    PlaceRead,
    PlaceUpdate,
    PlaceWithDistance,
)
from ...services import maps
from ...services.dish_images import DISH_IMAGE_DIR

router = APIRouter(prefix="/places", tags=["places"])

PHOTO_CACHE_DIR = Path(__file__).resolve().parents[3] / "uploads" / "photos"
PHOTO_CACHE_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/scrape")
async def trigger_scrape():
    """Debug-only: run all mensa scrapers now and report what was written.

    Disabled in production. The scrapers also run on startup and every Monday
    morning; this is a manual trigger for the debug stage.
    """
    if settings.environment == "production":
        raise HTTPException(
            status_code=403, detail="Scrape trigger is disabled in production"
        )
    from ...scrapers.run import scrape_all

    summary = await scrape_all(enrich=True)
    from ...services.dish_images import generate_missing_dish_images

    summary["image_generation"] = await generate_missing_dish_images()
    return {"success": True, **summary}


@router.get("/distances", response_model=list[PlaceWithDistance])
async def get_places_with_distances(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    mode: str = Query("walking", pattern="^(walking|driving|bicycling|transit)$"),
    db: AsyncSession = Depends(get_db),
):
    """Call 2 — read places from the DB and attach the travel distance from the
    user's current location, nearest first.

    Uses the Routes API when available; if it isn't (no key / billing disabled /
    transport error) it falls back to straight-line distances and logs a warning.
    """
    places = (
        await db.scalars(
            select(Place)
            .where(Place.ignore.is_(False))
            .where(Place.latitude.is_not(None))
            .where(Place.longitude.is_not(None))
        )
    ).all()

    results = [PlaceWithDistance.model_validate(place) for place in places]

    if results:
        destinations = [(p.latitude, p.longitude) for p in places]
        # Routes API when available, otherwise straight-line (logged on fallback).
        distances = await maps.travel_distances(
            (latitude, longitude), destinations, mode=mode
        )
        for item, dist in zip(results, distances):
            if dist:
                for field, value in dist.items():
                    setattr(item, field, value)

    # Nearest first; places without a distance sort to the end.
    results.sort(
        key=lambda p: p.distance_meters if p.distance_meters is not None else float("inf")
    )
    return results


@router.get("/photo")
async def get_place_photo(
    name: str = Query(..., min_length=1),
    max_width_px: int = Query(1200, ge=1, le=4800),
    max_height_px: int | None = Query(None, ge=1, le=4800),
):
    """Resolve a stored Google photo name to a short-lived image redirect."""
    try:
        uri = await maps.photo_uri(
            name,
            max_width_px=max_width_px,
            max_height_px=max_height_px,
        )
    except maps.MapsError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    return RedirectResponse(uri)


@router.get("/photo-cache/{filename}")
async def get_cached_photo(filename: str):
    """Serve a locally cached place photo if one exists."""
    file_path = PHOTO_CACHE_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(file_path)


@router.get("/dish-images/{filename}")
async def get_dish_image(filename: str):
    """Serve an optimized generated menu-item image by its opaque filename."""
    if Path(filename).name != filename or not filename.endswith(".webp"):
        raise HTTPException(status_code=404, detail="Image not found")
    file_path = DISH_IMAGE_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path, media_type="image/webp")


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
