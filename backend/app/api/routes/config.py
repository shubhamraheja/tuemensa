from fastapi import APIRouter

from ...core.config import settings

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/maps")
async def get_maps_config():
    return {"googleMapsApiKey": settings.google_maps_api_key}
