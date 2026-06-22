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


class PlaceCoordinate(BaseModel):
    latitude: float
    longitude: float


class NearbyFoodPlace(BaseModel):
    id: str
    name: str
    address: str | None = None
    location: PlaceCoordinate
    rating: float | None = None
    user_rating_count: int | None = None
    price_level: str | None = None
    open_now: bool | None = None
    types: list[str] = []
    google_maps_uri: str | None = None
    website_uri: str | None = None


class NearbyFoodResponse(BaseModel):
    places: list[NearbyFoodPlace]
