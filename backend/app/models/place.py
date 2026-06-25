import enum

from sqlalchemy import JSON, Boolean, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class PriceTier(str, enum.Enum):
    UNDER_5 = "<5"
    FIVE_TO_TEN = "5-10"
    OVER_TEN = ">10"


class MealType(str, enum.Enum):
    MEAL = "meal"
    SNACK = "snack"


class Place(Base):
    """A food/restaurant option in Tübingen.

    Core fields are seeded from Google Places. Enrichment fields
    (vegan, allergens, menu) are filled in manually.
    Set ``ignore`` to True to hide a place without deleting it.
    """

    __tablename__ = "places"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)

    # Coordinates — required for proximity queries
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Google Places identity — unique so seeding can upsert
    google_place_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    user_rating_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    google_maps_uri: Mapped[str | None] = mapped_column(String(512), nullable=True)
    website_uri: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Classification — auto-set from Google types, overridable
    meal_type: Mapped[MealType | None] = mapped_column(Enum(MealType), nullable=True)
    price_tier: Mapped[PriceTier | None] = mapped_column(Enum(PriceTier), nullable=True)
    cuisine: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Manually enriched fields
    is_vegan_friendly: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_vegetarian_friendly: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    allergens: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Structured data — populated by scrapers or manually
    menu: Mapped[list] = mapped_column(JSON, default=list)
    opening_hours: Mapped[list] = mapped_column(JSON, default=list)

    ignore: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
