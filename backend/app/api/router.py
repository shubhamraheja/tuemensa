import logging
from importlib import import_module

from fastapi import APIRouter

logger = logging.getLogger(__name__)

api_router = APIRouter(prefix="/api/v1")


def include_route_module(module_name: str, router_name: str = "router") -> None:
    try:
        module = import_module(f".routes.{module_name}", package=__package__)
    except ModuleNotFoundError as exc:
        logger.warning("Skipping %s routes: %s", module_name, exc)
        return

    api_router.include_router(getattr(module, router_name))


include_route_module("menus")
include_route_module("locations")
