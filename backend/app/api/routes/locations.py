from fastapi import APIRouter, HTTPException, status
from ...models.location import Location
from ...schemas.location import LocationCreate, LocationUpdate

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/")
async def get_locations(active: bool = True):
    locations = await Location.find(Location.active == active).sort(+Location.name).to_list()
    return {"success": True, "data": locations}


@router.get("/{location_id}")
async def get_location(location_id: str):
    location = await Location.get(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"success": True, "data": location}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_location(body: LocationCreate):
    location = Location(**body.model_dump())
    await location.insert()
    return {"success": True, "data": location}


@router.put("/{location_id}")
async def update_location(location_id: str, body: LocationUpdate):
    location = await Location.get(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    await location.set(body.model_dump(exclude_unset=True))
    return {"success": True, "data": location}


@router.delete("/{location_id}")
async def delete_location(location_id: str):
    location = await Location.get(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    await location.delete()
    return {"success": True, "message": "Location deleted"}
