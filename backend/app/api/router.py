from fastapi import APIRouter
from .routes.menus import router as menus_router
from .routes.locations import router as locations_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(menus_router)
api_router.include_router(locations_router)
