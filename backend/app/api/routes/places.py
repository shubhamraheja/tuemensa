from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...models.place import Place, PlaceType
from ...schemas.place import PlaceCreate, PlaceRead, PlaceUpdate

router = APIRouter(prefix="/places", tags=["places"])


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
