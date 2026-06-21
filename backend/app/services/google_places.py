import httpx
from fastapi import HTTPException, status

from ..core.config import settings
from ..schemas.location import NearbyFoodPlace


PLACES_NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby"
PLACES_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.currentOpeningHours",
        "places.googleMapsUri",
        "places.primaryType",
    ]
)

SUPPORTED_FOOD_TYPES = {
    "restaurant",
    "cafe",
    "bakery",
    "meal_takeaway",
}


async def search_nearby_food(
    *,
    latitude: float,
    longitude: float,
    radius_meters: int,
    max_results: int,
    place_type: str,
) -> list[NearbyFoodPlace]:
    if not settings.google_maps_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_MAPS_API_KEY is not configured",
        )

    if place_type not in SUPPORTED_FOOD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported food type: {place_type}",
        )

    payload = {
        "includedTypes": [place_type],
        "maxResultCount": max_results,
        "rankPreference": "DISTANCE",
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": latitude,
                    "longitude": longitude,
                },
                "radius": float(radius_meters),
            }
        },
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                PLACES_NEARBY_SEARCH_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=_google_error_detail(exc.response),
            ) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google Places request failed: {exc}",
            ) from exc

    return [_parse_place(place) for place in response.json().get("places", [])]


def _parse_place(place: dict) -> NearbyFoodPlace:
    display_name = place.get("displayName") or {}
    location = place.get("location") or {}
    opening_hours = place.get("currentOpeningHours") or {}

    return NearbyFoodPlace(
        place_id=place["id"],
        name=display_name.get("text") or "Unknown place",
        address=place.get("formattedAddress"),
        latitude=location["latitude"],
        longitude=location["longitude"],
        rating=place.get("rating"),
        user_rating_count=place.get("userRatingCount"),
        open_now=opening_hours.get("openNow"),
        maps_uri=place.get("googleMapsUri"),
        primary_type=place.get("primaryType"),
    )


def _google_error_detail(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return "Google Places returned an error"

    error = body.get("error") or {}
    return error.get("message") or "Google Places returned an error"
