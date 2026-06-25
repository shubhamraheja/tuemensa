import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import SessionLocal, init_db
from .core.scheduler import shutdown_scheduler, start_scheduler
from .api.router import api_router
from .services.seed import seed_places_if_empty
from .scrapers.run import scrape_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Call 1: fill the DB with Tübingen places on first boot (only if empty).
    async with SessionLocal() as session:
        await seed_places_if_empty(session)
    # Scrape mensa menus + enrich, in the background so startup isn't blocked.
    app.state.initial_scrape = asyncio.create_task(scrape_all(enrich=True))
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
