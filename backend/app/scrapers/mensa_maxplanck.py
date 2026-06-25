"""Scraper for the Max-Planck-Haus canteen ("MPI Haus").

Menu lives in an HTML weekday table at https://www.mph.tuebingen.mpg.de/menu:
one row per weekday with columns for the meat/fish main, the vegan/veggie main,
side dishes and dessert (plus a per-row "choice of the day" special).
"""

from __future__ import annotations

import logging
import re

import httpx
from bs4 import BeautifulSoup

from ..models.place import Place, PlaceType
from .base import BaseScraper

logger = logging.getLogger(__name__)

MENU_URL = "https://www.mph.tuebingen.mpg.de/menu"

# German + English weekday cell -> our short label.
_WEEKDAYS = {
    "monday": "Mon", "montag": "Mon",
    "tuesday": "Tue", "dienstag": "Tue",
    "wednesday": "Wed", "mittwoch": "Wed",
    "thursday": "Thu", "donnerstag": "Thu",
    "friday": "Fri", "freitag": "Fri",
}

# Column index (within a weekday row) -> menu category.
_COLUMNS = {
    2: "Main Course Meat / Fish",
    3: "Main Course vegan / veggie",
    4: "Side Dishes",
    5: "Dessert",
}

_PRICE_RE = re.compile(r"(\d+[.,]\d{1,2})\s*€")

_OPENING_HOURS = [
    {"day": day, "open": "11:30", "close": "14:00"}
    for day in ("Mon", "Tue", "Wed", "Thu", "Fri")
]


def _extract_price(text: str) -> float | None:
    match = _PRICE_RE.search(text)
    if not match:
        return None
    return float(match.group(1).replace(",", "."))


def _clean(text: str) -> str:
    # Drop the price token; collapse whitespace.
    return _PRICE_RE.sub("", text).strip(" : ")


class MaxPlanckHausScraper(BaseScraper):
    name = "Max-Planck-Haus (MPI Haus)"

    async def scrape(self) -> list[Place]:
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                response = await client.get(MENU_URL)
                response.raise_for_status()
            menu = self._parse(response.text)
        except Exception:  # noqa: BLE001 - never break startup
            logger.exception("Max-Planck-Haus scrape failed")
            menu = []

        return [
            Place(
                name="Max-Planck-Haus",
                location="Tübingen",
                place_type=PlaceType.MENSA,
                address="Max-Planck-Ring 13, 72076 Tübingen",
                latitude=48.5375022,
                longitude=9.0573711,
                website_uri=MENU_URL,
                opening_hours=_OPENING_HOURS,
                menu=menu,
            )
        ]

    def _parse(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, "html.parser")
        menu: list[dict] = []
        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                cells = [c.get_text(" ", strip=True) for c in row.find_all(["td", "th"])]
                if len(cells) < 6:
                    continue
                day = _WEEKDAYS.get(cells[1].strip().lower())
                if not day:
                    continue

                # Per-row special / choice of the day (skip the generic label).
                special = cells[0].strip()
                if special and "choice of the day" not in special.lower():
                    menu.append(
                        {
                            "name": _clean(special),
                            "price": _extract_price(special),
                            "day": day,
                            "category": "Choice of the Day",
                            "allergens": [],
                        }
                    )

                for index, category in _COLUMNS.items():
                    text = cells[index].strip()
                    if not text:
                        continue
                    menu.append(
                        {
                            "name": _clean(text),
                            "price": _extract_price(text),
                            "day": day,
                            "category": category,
                            "allergens": [],
                        }
                    )
        return menu
