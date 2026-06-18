from datetime import date
from pydantic import BaseModel
from ..models.menu import MenuItem


class MenuCreate(BaseModel):
    date: date
    location: str
    items: list[MenuItem] = []


class MenuUpdate(BaseModel):
    date: date | None = None
    location: str | None = None
    items: list[MenuItem] | None = None


class Pagination(BaseModel):
    total: int
    limit: int
    skip: int
