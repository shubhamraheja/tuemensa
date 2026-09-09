from pydantic import BaseModel, ConfigDict

from ..models.place import PlaceType, PriceRange


class MenuItem(BaseModel):
    name: str
    price: float | None = None
    # True when the price is per 100 g (e.g. Max-Planck-Haus mains) rather than per dish.
    price_per_100g: bool = False
    day: str | None = None  # "Mon".."Fri" for weekly menus; None if not day-specific
    category: str | None = None  # e.g. "Tagesmenü vegan", "Main Course", "DESSERT"
    allergens: list[str] = []
    # Generated food photograph, served by the backend from object/static storage.
    image_url: str | None = None


class OpeningHours(BaseModel):
    day: str
    open: str
    close: str


class PlaceBase(BaseModel):
    name: str
    location: str
    google_place_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    place_type: PlaceType | None = None
    cuisine: str | None = None
    is_vegetarian_friendly: bool | None = None
    is_vegan_friendly: bool | None = None
    google_types: list[str] = []
    menu: list[MenuItem] = []
    opening_hours: list[OpeningHours] = []
    price_range: PriceRange | None = None
    price_level: str | None = None
    price_start: int | None = None
    price_end: int | None = None
    rating: float | None = None
    user_rating_count: int | None = None
    google_maps_uri: str | None = None
    website_uri: str | None = None
    photo_name: str | None = None
    photo_url: str | None = None
    photo_attributions: list[str] | None = None
    ignore: bool = False


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    place_type: PlaceType | None = None
    cuisine: str | None = None
    is_vegetarian_friendly: bool | None = None
    is_vegan_friendly: bool | None = None
    google_types: list[str] | None = None
    menu: list[MenuItem] | None = None
    opening_hours: list[OpeningHours] | None = None
    price_range: PriceRange | None = None
    price_level: str | None = None
    price_start: int | None = None
    price_end: int | None = None
    rating: float | None = None
    user_rating_count: int | None = None
    google_maps_uri: str | None = None
    website_uri: str | None = None
    photo_name: str | None = None
    photo_attributions: list[str] | None = None
    ignore: bool | None = None


class PlaceRead(PlaceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class PlaceWithDistance(PlaceRead):
    """A place plus the live travel distance from the user's current location."""

    distance_meters: int | None = None
    duration_seconds: int | None = None
    distance_text: str | None = None
    duration_text: str | None = None
