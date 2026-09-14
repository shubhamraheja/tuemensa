"""Thin wrappers around the two Google Maps calls this app makes.

1. :func:`search_food_places` — used once at seed time to discover food places
   in Tübingen and fill the database.
2. :func:`distance_matrix` — used on app-open to get the live travel distance
   from the user's current location to the places already stored in the DB.

Both raise :class:`MapsError` on configuration/transport problems so callers
can decide how to degrade gracefully.
"""

from __future__ import annotations

import logging
import math
from urllib.parse import quote

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

# Tübingen city center; the seed search is centered here.
TUEBINGEN_CENTER = (48.5216, 9.0576)

NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby"
TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places"
ROUTE_MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"

NEARBY_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.priceRange",
        "places.types",
        "places.googleMapsUri",
        "places.websiteUri",
        "places.regularOpeningHours",
        "places.photos.name",
        "places.photos.authorAttributions.displayName",
    ]
)

PHOTO_FIELD_MASK = "photos.name,photos.authorAttributions.displayName"

# Food place types to search for, one Nearby Search each.
FOOD_TYPES = ["restaurant", "cafe", "bakery", "meal_takeaway"]

# Routes API travel mode names, keyed by the value our endpoint accepts.
_TRAVEL_MODE = {
    "walking": "WALK",
    "driving": "DRIVE",
    "bicycling": "BICYCLE",
    "transit": "TRANSIT",
}

ROUTE_MATRIX_FIELD_MASK = "originIndex,destinationIndex,distanceMeters,duration,condition"

# Keep each request small; 1 origin x 25 destinations is well within limits.
_MAX_DESTINATIONS = 25


def _format_distance(meters: int) -> str:
    if meters < 1000:
        return f"{meters} m"
    return f"{meters / 1000:.1f} km".replace(".0 km", " km")


def _format_duration(seconds: int) -> str:
    minutes = round(seconds / 60)
    if minutes < 60:
        return f"{minutes} min"
    hours, minutes = divmod(minutes, 60)
    return f"{hours} h {minutes} min" if minutes else f"{hours} h"


def _waypoint(lat: float, lng: float) -> dict:
    return {"waypoint": {"location": {"latLng": {"latitude": lat, "longitude": lng}}}}


class MapsError(RuntimeError):
    """Raised when a Google Maps request cannot be made or completed."""


def _require_key() -> str:
    if not settings.google_maps_api_key:
        raise MapsError("GOOGLE_MAPS_API_KEY is not configured")
    return settings.google_maps_api_key


async def search_food_places(
    *,
    center: tuple[float, float] = TUEBINGEN_CENTER,
    radius: int = 3000,
    max_per_type: int = 20,
    types: list[str] | None = None,
) -> list[dict]:
    """Call 1 — discover food places around ``center`` (default: Tübingen).

    Runs one Nearby Search per place type (Google caps each at 20 results) and
    de-duplicates by place id, so we collect well beyond a single 20-result
    page. Returns raw Google place dicts that have an id and a location.
    """
    key = _require_key()
    latitude, longitude = center
    search_types = types or FOOD_TYPES
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    }

    found: dict[str, dict] = {}
    async with httpx.AsyncClient(timeout=15) as client:
        for place_type in search_types:
            payload = {
                "includedTypes": [place_type],
                "maxResultCount": max_per_type,
                "rankPreference": "DISTANCE",
                "locationRestriction": {
                    "circle": {
                        "center": {"latitude": latitude, "longitude": longitude},
                        "radius": radius,
                    }
                },
            }
            try:
                response = await client.post(
                    NEARBY_SEARCH_URL, json=payload, headers=headers
                )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                # Skip a failing type rather than losing the whole seed.
                logger.warning("Nearby search for '%s' failed: %s", place_type, exc)
                continue
            for place in response.json().get("places", []):
                if "id" in place and "location" in place:
                    found[place["id"]] = place

    return list(found.values())


async def search_text(query: str) -> dict | None:
    """Find the single best-matching place for a free-text query (e.g. a mensa
    name). Used to enrich scraped places with Google data (hours, ratings, …).

    Returns the raw Google place dict, or ``None`` if nothing matched.
    """
    key = _require_key()
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    }
    payload = {
        "textQuery": query,
        "maxResultCount": 1,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": TUEBINGEN_CENTER[0],
                    "longitude": TUEBINGEN_CENTER[1],
                },
                "radius": 6000.0,
            }
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(TEXT_SEARCH_URL, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise MapsError(f"Google text search failed: {exc}") from exc

    places = response.json().get("places", [])
    return places[0] if places else None


async def place_photo_details(place_id: str) -> dict | None:
    """Fetch just photo metadata for an existing Google place id."""
    key = _require_key()
    headers = {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": PHOTO_FIELD_MASK,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{PLACE_DETAILS_URL}/{quote(place_id, safe='')}", headers=headers)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise MapsError(f"Google place details failed: {exc}") from exc
    data = response.json()
    return data if data.get("photos") else None


async def photo_uri(
    photo_name: str,
    *,
    max_width_px: int = 1200,
    max_height_px: int | None = None,
) -> str:
    """Resolve a Google Places photo resource name to a short-lived image URI."""
    key = _require_key()
    if not photo_name.startswith("places/") or "/photos/" not in photo_name:
        raise MapsError("Invalid Google Places photo name")

    params: dict[str, str | int | bool] = {
        "key": key,
        "maxWidthPx": max_width_px,
        "skipHttpRedirect": True,
    }
    if max_height_px is not None:
        params["maxHeightPx"] = max_height_px

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            encoded_name = quote(photo_name, safe="/")
            response = await client.get(
                f"https://places.googleapis.com/v1/{encoded_name}/media",
                params=params,
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise MapsError(f"Google photo request failed: {exc}") from exc

    uri = response.json().get("photoUri")
    if not uri:
        raise MapsError("Google photo response did not include photoUri")
    return uri


async def distance_matrix(
    origin: tuple[float, float],
    destinations: list[tuple[float, float]],
    *,
    mode: str = "walking",
) -> list[dict | None]:
    """Call 2 — travel distance from ``origin`` to each destination via the
    Routes API (``computeRouteMatrix``).

    Returns a list aligned with ``destinations``; each entry is either a dict
    with ``distance_meters``/``duration_seconds``/``distance_text``/
    ``duration_text`` or ``None`` when Google could not route to that place.
    """
    key = _require_key()
    if not destinations:
        return []

    travel_mode = _TRAVEL_MODE.get(mode, "WALK")
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": ROUTE_MATRIX_FIELD_MASK,
    }

    results: list[dict | None] = []

    for start in range(0, len(destinations), _MAX_DESTINATIONS):
        chunk = destinations[start : start + _MAX_DESTINATIONS]
        payload = {
            "origins": [_waypoint(*origin)],
            "destinations": [_waypoint(lat, lng) for lat, lng in chunk],
            "travelMode": travel_mode,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    ROUTE_MATRIX_URL, json=payload, headers=headers
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise MapsError(f"Google Routes request failed: {exc}") from exc

        # computeRouteMatrix returns a flat list of elements that may arrive out
        # of order; map each back to its slot via destinationIndex.
        chunk_results: list[dict | None] = [None] * len(chunk)
        for element in response.json():
            index = element.get("destinationIndex")
            if index is None or not (0 <= index < len(chunk)):
                continue
            if element.get("condition") != "ROUTE_EXISTS":
                continue
            meters = element.get("distanceMeters", 0)
            seconds = int(float(str(element.get("duration", "0s")).rstrip("s") or 0))
            chunk_results[index] = {
                "distance_meters": meters,
                "distance_text": _format_distance(meters),
                "duration_seconds": seconds,
                "duration_text": _format_duration(seconds),
            }

        results.extend(chunk_results)

    return results


# Walking speed used to estimate duration for straight-line distances (~5 km/h).
_WALKING_SPEED_MPS = 1.39


def _haversine_meters(origin: tuple[float, float], dest: tuple[float, float]) -> float:
    """Great-circle distance between two lat/lng points, in meters."""
    radius = 6_371_000.0
    lat1, lon1 = math.radians(origin[0]), math.radians(origin[1])
    lat2, lon2 = math.radians(dest[0]), math.radians(dest[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(h))


def haversine_distances(
    origin: tuple[float, float], destinations: list[tuple[float, float]]
) -> list[dict]:
    """Free, offline straight-line distances with an estimated walking time."""
    out: list[dict] = []
    for dest in destinations:
        meters = round(_haversine_meters(origin, dest))
        seconds = round(meters / _WALKING_SPEED_MPS)
        out.append(
            {
                "distance_meters": meters,
                "distance_text": _format_distance(meters),
                "duration_seconds": seconds,
                "duration_text": _format_duration(seconds),
            }
        )
    return out


async def travel_distances(
    origin: tuple[float, float],
    destinations: list[tuple[float, float]],
    *,
    mode: str = "walking",
) -> list[dict | None]:
    """Distances from ``origin`` to each destination.

    Tries the Routes API first; if it's unavailable (no key, billing disabled,
    transport error) it logs a warning and falls back to straight-line
    (haversine) distances so the app keeps showing something useful.
    """
    if not destinations:
        return []
    try:
        return await distance_matrix(origin, destinations, mode=mode)
    except MapsError as exc:
        logger.warning(
            "Routes API unavailable (%s); falling back to straight-line (haversine) "
            "distances. Enable Routes API billing for real walking distances.",
            exc,
        )
        return haversine_distances(origin, destinations)
