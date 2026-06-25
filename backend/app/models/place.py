import enum

from sqlalchemy import JSON, Boolean, Enum, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class PriceRange(str, enum.Enum):
    """Coarse price bracket for a place (in euros)."""

    LOW = "0-5"
    MEDIUM = "5-10"
    HIGH = "10-20"
    PREMIUM = "20+"


class PlaceType(str, enum.Enum):
    """The kind of establishment a place is."""

    MENSA = "mensa"
    CAFETERIA = "cafeteria"
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    BISTRO = "bistro"
    BAKERY = "bakery"


class Place(Base):
    """A food/restaurant option.

    ``menu`` and ``opening_hours`` are stored as JSON so the whole option
    lives in a single row. Coordinates (``latitude``/``longitude``) are what the
    app-open distance call uses as destinations. Set ``ignore`` to True to
    exclude a place from being used downstream (kept in the DB but treated as
    if absent).
    """

    __tablename__ = "places"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    location: Mapped[str] = mapped_column(String(255))

    # Google Places identifier; lets us re-seed idempotently and dedupe.
    google_place_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )

    # Geographic position. Destinations for the distance (app-open) call.
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Human-readable address from Google.
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # What kind of place this is (mensa, restaurant, ...).
    place_type: Mapped[PlaceType | None] = mapped_column(
        Enum(PlaceType), nullable=True
    )

    # Free-text cuisine offered, e.g. "italian", "chinese".
    cuisine: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Raw Google place types, e.g. ["restaurant", "cafe"].
    google_types: Mapped[list] = mapped_column(JSON, default=list)

    # List of menu items, e.g. [{"name": "Pasta", "price": 4.5}, ...]
    menu: Mapped[list] = mapped_column(JSON, default=list)

    # List of opening times, e.g. [{"day": "Mon", "open": "08:00", "close": "20:00"}, ...]
    opening_hours: Mapped[list] = mapped_column(JSON, default=list)

    price_range: Mapped[PriceRange | None] = mapped_column(
        Enum(PriceRange), nullable=True
    )

    # Google's own coarse price level, e.g. "PRICE_LEVEL_MODERATE".
    price_level: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Actual price range in euros from Google (e.g. 10–20 €). Far more widely
    # populated than price_level, so this is the primary price shown.
    price_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_end: Mapped[int | None] = mapped_column(Integer, nullable=True)

    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    user_rating_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    google_maps_uri: Mapped[str | None] = mapped_column(String(512), nullable=True)
    website_uri: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # If True, this place's data is ignored downstream.
    ignore: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
