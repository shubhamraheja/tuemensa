"""Scraper for The Hungry Elk (Technologiepark Tübingen).

The menu is published only as a weekly PDF. Its text layer extracts, but the
columnar (per-weekday) layout doesn't survive extraction cleanly, so this is a
best-effort parse: dishes are grouped by their category header (SALATBOWL,
PIZZA & PASTA, …) with the internal price, but not reliably per weekday.
"""

from __future__ import annotations

import io
import logging
import re

import httpx
from pypdf import PdfReader

from ..models.place import Place, PlaceType
from .base import BaseScraper

logger = logging.getLogger(__name__)

PDF_URL = "https://stollsteimer.de/easy-pdf-restaurant-menu/menu-files/menu-thehungryelk.pdf"

_CATEGORIES = ["SALATBOWL", "PIZZA & PASTA", "AUS DER REGION", "STREET FOOD", "DESSERT"]
_PRICE_RE = re.compile(r"Int:\s*([\d.,]+)\s*€")
_ALLERGEN_RE = re.compile(r"\(([A-Z][A-Za-z0-9,\s/]*)\)")
# Everything from here on is the allergen legend / footer, not dishes.
_FOOTER_MARKERS = ("Allergene und kennzeichnungspflichtige", "MENÜ", "Öffnungszeiten")

_OPENING_HOURS = [
    {"day": day, "open": open_, "close": close_}
    for day in ("Mon", "Tue", "Wed", "Thu", "Fri")
    for open_, close_ in (("07:30", "09:30"), ("11:30", "13:30"))
]


def _match_category(line: str) -> tuple[str | None, str]:
    for category in _CATEGORIES:
        if line.upper().startswith(category):
            return category, line[len(category):].strip()
    return None, line


def _clean_name(text: str) -> str:
    text = _ALLERGEN_RE.sub("", text)  # drop allergen codes
    text = re.sub(r"\s+l\s+", " ", f" {text} ")  # PDF bullet separators
    return re.sub(r"\s+", " ", text).strip(" ,")[:120]


def _allergens(lines: list[str]) -> list[str]:
    codes: list[str] = []
    for match in _ALLERGEN_RE.findall(" ".join(lines)):
        codes.extend(c.strip() for c in re.split(r"[,/]", match) if c.strip())
    return sorted(set(codes))


def _parse(text: str) -> list[dict]:
    lines = [ln.strip() for ln in text.splitlines()]
    menu: list[dict] = []
    seen: set[tuple[str, float | None]] = set()
    category: str | None = None
    buffer: list[str] = []

    for line in lines:
        if not line:
            continue
        if any(line.startswith(marker) for marker in _FOOTER_MARKERS):
            break

        new_category, rest = _match_category(line)
        if new_category:
            category = new_category
            buffer = [rest] if rest else []
            continue

        price_match = _PRICE_RE.search(line)
        if price_match:
            if buffer:
                name = _clean_name(buffer[0])
                price = float(price_match.group(1).replace(",", "."))
                key = (name.lower(), price)
                if name and key not in seen:
                    seen.add(key)
                    menu.append(
                        {
                            "name": name,
                            "price": price,
                            "day": None,
                            "category": category,
                            "allergens": _allergens(buffer),
                        }
                    )
            buffer = []
            continue

        buffer.append(line)

    return menu


class HungryElkScraper(BaseScraper):
    name = "The Hungry Elk"

    async def scrape(self) -> list[Place]:
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                response = await client.get(PDF_URL)
                response.raise_for_status()
            reader = PdfReader(io.BytesIO(response.content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            menu = _parse(text)
        except Exception:  # noqa: BLE001 - never break startup
            logger.exception("Hungry Elk scrape failed")
            menu = []

        return [
            Place(
                name="The Hungry Elk",
                location="Tübingen",
                place_type=PlaceType.CAFETERIA,
                address="Maria-von-Linden-Straße 2, 72076 Tübingen",
                latitude=48.5384922,
                longitude=9.0557892,
                website_uri="https://stollsteimer.de/restaurants/the-hungry-elk/",
                opening_hours=_OPENING_HOURS,
                menu=menu,
            )
        ]
