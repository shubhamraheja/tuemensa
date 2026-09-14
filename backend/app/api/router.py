from fastapi import APIRouter
from .routes.places import router as places_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(places_router)
