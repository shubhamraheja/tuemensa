import enum

from sqlalchemy import JSON, Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class PriceRange(str, enum.Enum):
    """Coarse price bracket for a place (in euros)."""

    LOW = "0-5"
    MEDIUM = "5-10"
    HIGH = "10-20"
    PREMIUM = "20+"


class Place(Base):
    """A food/restaurant option.

    ``menu`` and ``opening_hours`` are stored as JSON so the whole option
    lives in a single row. Set ``ignore`` to True to exclude a place from
    being used downstream (kept in the DB but treated as if absent).
    """

    __tablename__ = "places"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    location: Mapped[str] = mapped_column(String(255))

    # List of menu items, e.g. [{"name": "Pasta", "price": 4.5}, ...]
    menu: Mapped[list] = mapped_column(JSON, default=list)

    # List of opening times, e.g. [{"day": "Mon", "open": "08:00", "close": "20:00"}, ...]
    opening_hours: Mapped[list] = mapped_column(JSON, default=list)

    price_range: Mapped[PriceRange | None] = mapped_column(
        Enum(PriceRange), nullable=True
    )

    # If True, this place's data is ignored downstream.
    ignore: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
