from datetime import date as Date
from pydantic import BaseModel
from ..models.menu import MenuItem


class MenuCreate(BaseModel):
    date: Date
    location: str
    items: list[MenuItem] = []


class MenuUpdate(BaseModel):
    date: Date | None = None
    location: str | None = None
    items: list[MenuItem] | None = None


class Pagination(BaseModel):
    total: int
    limit: int
    skip: int
