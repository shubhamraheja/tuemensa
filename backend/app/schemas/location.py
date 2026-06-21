from pydantic import BaseModel
from ..models.location import OpeningHours


class LocationCreate(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    opening_hours: list[OpeningHours] = []
    phone: str | None = None
    email: str | None = None


class LocationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    opening_hours: list[OpeningHours] | None = None
    phone: str | None = None
    email: str | None = None
    active: bool | None = None


class NearbyFoodPlace(BaseModel):
    place_id: str
    name: str
    address: str | None = None
    latitude: float
    longitude: float
    rating: float | None = None
    user_rating_count: int | None = None
    open_now: bool | None = None
    maps_uri: str | None = None
    primary_type: str | None = None
