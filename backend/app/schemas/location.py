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
