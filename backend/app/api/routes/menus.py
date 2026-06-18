from datetime import date
from fastapi import APIRouter, HTTPException, Query, status
from beanie.operators import GTE, LT
from ...models.menu import Menu
from ...models.location import Location
from ...schemas.menu import MenuCreate, MenuUpdate

router = APIRouter(prefix="/menus", tags=["menus"])


@router.get("/")
async def get_menus(
    date_filter: date | None = Query(None, alias="date"),
    location: str | None = None,
    limit: int = 10,
    skip: int = 0,
):
    query = Menu.find()
    if date_filter:
        from datetime import timedelta
        next_day = date_filter + timedelta(days=1)
        query = query.find(GTE(Menu.date, date_filter), LT(Menu.date, next_day))
    if location:
        query = query.find(Menu.location == location)
    total = await query.count()
    menus = await query.skip(skip).limit(limit).sort(-Menu.date).to_list()
    return {"success": True, "data": menus, "pagination": {"total": total, "limit": limit, "skip": skip}}


@router.get("/{menu_id}")
async def get_menu(menu_id: str):
    menu = await Menu.get(menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    return {"success": True, "data": menu}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_menu(body: MenuCreate):
    if not await Location.find_one(Location.name == body.location):
        raise HTTPException(status_code=400, detail="Location not found")
    menu = Menu(**body.model_dump())
    await menu.insert()
    return {"success": True, "data": menu}


@router.put("/{menu_id}")
async def update_menu(menu_id: str, body: MenuUpdate):
    menu = await Menu.get(menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    update_data = body.model_dump(exclude_unset=True)
    await menu.set(update_data)
    return {"success": True, "data": menu}


@router.delete("/{menu_id}")
async def delete_menu(menu_id: str):
    menu = await Menu.get(menu_id)
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    await menu.delete()
    return {"success": True, "message": "Menu deleted"}
