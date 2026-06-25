"""Scraper for the Tübingen university mensas via the OpenMensa API.

OpenMensa (https://openmensa.org) exposes the Studierendenwerk canteens as a
clean JSON API, so we get the weekly menu, name, address and coordinates
without fragile HTML parsing. It does *not* provide opening hours or ratings —
those are filled later by the Google enrichment step.
"""

from __future__ import annotations

import datetime
import logging

import httpx

from ..models.place import Place, PlaceType
from .base import BaseScraper

logger = logging.getLogger(__name__)

OPENMENSA_API = "https://openmensa.org/api/v2"
DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Tübingen-direct canteens only (Rottenburg and schools excluded).
CANTEENS = [
    {"id": 1771, "name": "Mensa Wilhelmstraße", "type": PlaceType.MENSA},
    {"id": 1768, "name": "Mensa Prinz Karl", "type": PlaceType.MENSA},
    {"id": 1766, "name": "Mensa Morgenstelle", "type": PlaceType.MENSA},
    {"id": 1763, "name": "Cafeteria Morgenstelle", "type": PlaceType.CAFETERIA},
]


def _current_week() -> list[datetime.date]:
    """Monday–Friday of the current week."""
    today = datetime.date.today()
    monday = today - datetime.timedelta(days=today.weekday())
    return [monday + datetime.timedelta(days=offset) for offset in range(5)]


class OpenMensaScraper(BaseScraper):
    name = "Tübingen Uni mensas (OpenMensa)"

    async def scrape(self) -> list[Place]:
        week = _current_week()
        places: list[Place] = []
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                for canteen in CANTEENS:
                    place = await self._scrape_canteen(client, canteen, week)
                    if place is not None:
                        places.append(place)
        except Exception:  # noqa: BLE001 - a scraper must not break startup
            logger.exception("OpenMensa scrape failed")
        return places

    async def _scrape_canteen(
        self, client: httpx.AsyncClient, canteen: dict, week: list[datetime.date]
    ) -> Place | None:
        cid = canteen["id"]
        try:
            detail = (await client.get(f"{OPENMENSA_API}/canteens/{cid}")).json()
        except httpx.HTTPError as exc:
            logger.warning("OpenMensa canteen %s detail failed: %s", cid, exc)
            return None

        coordinates = detail.get("coordinates") or [None, None]
        menu: list[dict] = []
        for day in week:
            try:
                response = await client.get(
                    f"{OPENMENSA_API}/canteens/{cid}/days/{day.isoformat()}/meals"
                )
            except httpx.HTTPError as exc:
                logger.warning("OpenMensa meals %s/%s failed: %s", cid, day, exc)
                continue
            if response.status_code != 200:
                continue  # closed day / no menu published
            label = DAY_LABELS[day.weekday()]
            for meal in response.json():
                prices = meal.get("prices") or {}
                menu.append(
                    {
                        "name": meal.get("name", ""),
                        "price": prices.get("students") or prices.get("others"),
                        "day": label,
                        "category": meal.get("category"),
                        "allergens": meal.get("notes") or [],
                    }
                )

        return Place(
            name=canteen["name"],
            location="Tübingen",
            place_type=canteen["type"],
            address=detail.get("address"),
            latitude=coordinates[0],
            longitude=coordinates[1],
            menu=menu,
            opening_hours=[],  # filled by Google enrichment
        )
