"""Scraper for The Hungry Elk (Technologiepark Tübingen).

The weekly menu is a PDF laid out as a 5-weekday × 5-category grid. Plain text
extraction destroys the columns, so we parse positionally with pdfplumber:
weekday columns come from the header x-centers, category rows from the
left-gutter labels, and each (day, category) cell holds one dish.
"""

from __future__ import annotations

import io
import logging
import re

import httpx
import pdfplumber

from ..models.place import Place, PlaceType
from .base import BaseScraper

logger = logging.getLogger(__name__)

PDF_URL = "https://stollsteimer.de/easy-pdf-restaurant-menu/menu-files/menu-thehungryelk.pdf"

GERMAN_DAYS = {
    "MONTAG": "Mon",
    "DIENSTAG": "Tue",
    "MITTWOCH": "Wed",
    "DONNERSTAG": "Thu",
    "FREITAG": "Fri",
}
# First gutter word -> full category label.
CATEGORY_STARTS = {
    "SALATBOWL": "SALATBOWL",
    "PIZZA": "PIZZA & PASTA",
    "AUS": "AUS DER REGION",
    "STREET": "STREET FOOD",
    "DESSERT": "DESSERT",
}

# First euro amount in a cell = internal price ("6,80 €/ 8,80 €" or "Int: 6,90 €").
_PRICE_RE = re.compile(r"(\d+[.,]\d{2})\s*€")
_ALLERGEN_RE = re.compile(r"\(([A-Z][A-Za-z0-9,\s/]*)\)")
_SKIP_RE = re.compile(r"siehe\s+Aushang", re.IGNORECASE)
_PER_100G_RE = re.compile(r"100\s*g", re.IGNORECASE)
# Vertical tolerance when clustering words into lines / matching row bands.
_LINE_TOLERANCE = 8

_OPENING_HOURS = [
    {"day": day, "open": open_, "close": close_}
    for day in ("Mon", "Tue", "Wed", "Thu", "Fri")
    for open_, close_ in (("07:30", "09:30"), ("11:30", "13:30"))
]


def _clean_name(text: str) -> str:
    text = _ALLERGEN_RE.sub("", text)  # drop allergen code groups
    text = _PRICE_RE.sub("", text)
    text = re.sub(r"\s+l\s+", " ", f" {text} ")  # PDF bullet separators
    return re.sub(r"\s+", " ", text).strip(" ,")[:120]


def _allergens(text: str) -> list[str]:
    codes: set[str] = set()
    for group in _ALLERGEN_RE.findall(text):
        codes.update(c.strip() for c in re.split(r"[,/]", group) if c.strip())
    return sorted(codes)


def _lines(cell_words: list[dict]) -> list[str]:
    """Cluster a cell's words into text lines, top-to-bottom."""
    ordered = sorted(cell_words, key=lambda w: (w["top"], w["x0"]))
    lines: list[str] = []
    current: list[dict] = []
    last_top: float | None = None
    for word in ordered:
        if last_top is not None and abs(word["top"] - last_top) > _LINE_TOLERANCE:
            lines.append(" ".join(w["text"] for w in current))
            current = []
        current.append(word)
        last_top = word["top"]
    if current:
        lines.append(" ".join(w["text"] for w in current))
    return lines


def build_menu(words: list[dict]) -> list[dict]:
    """Pure grid parser over pdfplumber-style words ({text, x0, x1, top}).

    Returns menu-item dicts with real weekday labels. Exposed separately so it
    can be unit-tested with synthetic word layouts.
    """
    headers = sorted(
        (
            (GERMAN_DAYS[w["text"].upper()], (w["x0"] + w["x1"]) / 2, w["top"])
            for w in words
            if w["text"].upper() in GERMAN_DAYS
        ),
        key=lambda h: h[1],
    )
    if len(headers) < 2:
        logger.warning("Hungry Elk PDF: weekday headers not found; got %s", headers)
        return []
    centers = [center for _, center, _ in headers]
    header_top = min(top for _, _, top in headers)
    # Words left of the first day column are the category gutter.
    gutter_cut = centers[0] - (centers[1] - centers[0]) * 0.75

    categories = sorted(
        (
            (CATEGORY_STARTS[w["text"].upper()], w["top"])
            for w in words
            if w["x0"] < gutter_cut
            and w["text"].upper() in CATEGORY_STARTS
            and w["top"] > header_top
        ),
        key=lambda c: c[1],
    )
    if not categories:
        logger.warning("Hungry Elk PDF: category labels not found")
        return []
    # Everything below the allergen legend is footer.
    legend_top = min(
        (w["top"] for w in words if w["text"].startswith("Allergene")),
        default=float("inf"),
    )

    def day_for(word: dict) -> str | None:
        center = (word["x0"] + word["x1"]) / 2
        if center < gutter_cut:
            return None
        distances = [abs(center - c) for c in centers]
        return headers[distances.index(min(distances))][0]

    def category_for(word: dict) -> str | None:
        if word["top"] <= categories[0][1] - _LINE_TOLERANCE:
            return None
        if word["top"] >= legend_top - _LINE_TOLERANCE / 2:
            return None
        current = None
        for name, top in categories:
            if word["top"] >= top - _LINE_TOLERANCE:
                current = name
        return current

    cells: dict[tuple[str, str], list[dict]] = {}
    for word in words:
        if word["top"] <= header_top + _LINE_TOLERANCE:
            continue
        day = day_for(word)
        category = category_for(word)
        if day and category:
            cells.setdefault((category, day), []).append(word)

    menu: list[dict] = []
    for category, _top in categories:
        for day in GERMAN_DAYS.values():
            cell = cells.get((category, day))
            if not cell:
                continue
            lines = _lines(cell)
            text = " ".join(lines)
            if _SKIP_RE.search(text):
                continue  # "siehe Aushang" placeholder, not a dish
            name = _clean_name(lines[0])
            if not name:
                continue
            price_match = _PRICE_RE.search(text)
            menu.append(
                {
                    "name": name,
                    "price": float(price_match.group(1).replace(",", ".")) if price_match else None,
                    "price_per_100g": bool(_PER_100G_RE.search(text)),
                    "day": day,
                    "category": category,
                    "allergens": _allergens(text),
                }
            )
    return menu


class HungryElkScraper(BaseScraper):
    name = "The Hungry Elk"

    async def scrape(self) -> list[Place]:
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                response = await client.get(PDF_URL)
                response.raise_for_status()
            with pdfplumber.open(io.BytesIO(response.content)) as pdf:
                words = [
                    word
                    for page in pdf.pages
                    for word in page.extract_words()
                ]
            menu = build_menu(words)
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
