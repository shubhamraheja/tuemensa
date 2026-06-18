from datetime import date
from beanie import Document
from pydantic import BaseModel


class NutritionInfo(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float | None = None


class MenuItem(BaseModel):
    name: str
    description: str
    price: float
    category: str
    allergens: list[str] = []
    nutrition_info: NutritionInfo | None = None
    available: bool = True
    image: str | None = None


class Menu(Document):
    date: date
    location: str
    items: list[MenuItem] = []

    class Settings:
        name = "menus"
        indexes = [
            "date",
            "location",
            [("date", 1), ("location", 1)],
        ]
