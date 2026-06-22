from pydantic import BaseModel, ConfigDict

from ..models.place import PlaceType, PriceRange


class MenuItem(BaseModel):
    name: str
    price: float | None = None


class OpeningHours(BaseModel):
    day: str
    open: str
    close: str


class PlaceBase(BaseModel):
    name: str
    location: str
    place_type: PlaceType | None = None
    cuisine: str | None = None
    menu: list[MenuItem] = []
    opening_hours: list[OpeningHours] = []
    price_range: PriceRange | None = None
    ignore: bool = False


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    place_type: PlaceType | None = None
    cuisine: str | None = None
    menu: list[MenuItem] | None = None
    opening_hours: list[OpeningHours] | None = None
    price_range: PriceRange | None = None
    ignore: bool | None = None


class PlaceRead(PlaceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
