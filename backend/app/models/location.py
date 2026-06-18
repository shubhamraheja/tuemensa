from beanie import Document
from pydantic import BaseModel


class OpeningHours(BaseModel):
    day: str
    open: str
    close: str


class Location(Document):
    name: str
    address: str
    latitude: float
    longitude: float
    opening_hours: list[OpeningHours] = []
    phone: str | None = None
    email: str | None = None
    active: bool = True

    class Settings:
        name = "locations"
        indexes = ["name", "active"]
