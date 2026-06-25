from pydantic import BaseModel, ConfigDict

from ..models.place import MealType, PriceTier


class MenuItem(BaseModel):
    name: str
    price: float | None = None


class OpeningHours(BaseModel):
    day: str
    open: str
    close: str


class PlaceBase(BaseModel):
    name: str
    latitude: float | None = None
    longitude: float | None = None
    google_place_id: str | None = None
    address: str | None = None
    rating: float | None = None
    user_rating_count: int | None = None
    google_maps_uri: str | None = None
    website_uri: str | None = None
    meal_type: MealType | None = None
    price_tier: PriceTier | None = None
    cuisine: str | None = None
    is_vegan_friendly: bool | None = None
    is_vegetarian_friendly: bool | None = None
    allergens: list[str] | None = None
    menu: list[MenuItem] = []
    opening_hours: list[OpeningHours] = []
    ignore: bool = False


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(BaseModel):
    name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    google_place_id: str | None = None
    address: str | None = None
    rating: float | None = None
    user_rating_count: int | None = None
    google_maps_uri: str | None = None
    website_uri: str | None = None
    meal_type: MealType | None = None
    price_tier: PriceTier | None = None
    cuisine: str | None = None
    is_vegan_friendly: bool | None = None
    is_vegetarian_friendly: bool | None = None
    allergens: list[str] | None = None
    menu: list[MenuItem] | None = None
    opening_hours: list[OpeningHours] | None = None
    ignore: bool | None = None


class PlaceRead(PlaceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class PlaceCoordinate(BaseModel):
    latitude: float
    longitude: float


class NearbySearchResult(BaseModel):
    """A place returned from a nearby search — DB fields merged with live open_now status."""

    id: int
    google_place_id: str | None = None
    name: str
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    rating: float | None = None
    user_rating_count: int | None = None
    price_tier: PriceTier | None = None
    meal_type: MealType | None = None
    cuisine: str | None = None
    is_vegan_friendly: bool | None = None
    is_vegetarian_friendly: bool | None = None
    allergens: list[str] | None = None
    menu: list[MenuItem] = []
    opening_hours: list[OpeningHours] = []
    google_maps_uri: str | None = None
    website_uri: str | None = None
    open_now: bool | None = None  # from live Google response, not stored
    distance_m: float | None = None  # computed at query time


class NearbySearchResponse(BaseModel):
    places: list[NearbySearchResult]
