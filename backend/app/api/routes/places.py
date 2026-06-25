from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...models.place import Place, PlaceType
from ...schemas.place import (
    PlaceCreate,
    PlaceRead,
    PlaceUpdate,
    PlaceWithDistance,
)
from ...services import maps

router = APIRouter(prefix="/places", tags=["places"])


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
