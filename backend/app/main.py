import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import SessionLocal, init_db
from .core.scheduler import shutdown_scheduler, start_scheduler
from .api.router import api_router
from .services.seed import seed_places_if_empty
from .services.dish_images import generate_missing_dish_images
from .scrapers.run import scrape_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Call 1: fill the DB with Tübingen places on first boot (only if empty).
    async with SessionLocal() as session:
        await seed_places_if_empty(session)
    async def refresh_menus_and_images():
        # Images run after the scrape so fresh dishes are eligible immediately.
        await scrape_all(enrich=True)
        return await generate_missing_dish_images()

    # Run without blocking API startup; the scheduler continues filling later batches.
    app.state.initial_scrape = asyncio.create_task(refresh_menus_and_images())
    # Weekly Monday-morning menu refresh.
    start_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


app = FastAPI(
    title="TUE Mensa API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "OK"}
