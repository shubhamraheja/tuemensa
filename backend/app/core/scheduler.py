"""APScheduler setup: refresh the mensa menus weekly on Monday morning."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from ..scrapers.run import scrape_all
from ..services.dish_images import generate_missing_dish_images
from .config import settings

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def refresh_menus_then_images() -> None:
    """Refresh weekly menus, then enqueue the first generated-image batch."""
    await scrape_all(enrich=False)
    await generate_missing_dish_images()


def start_scheduler() -> AsyncIOScheduler:
    """Start the in-process scheduler (weekly Monday menu refresh)."""
    global _scheduler
    scheduler = AsyncIOScheduler(timezone="Europe/Berlin")
    scheduler.add_job(
        refresh_menus_then_images,
        CronTrigger(day_of_week="mon", hour=6, minute=0),
        id="weekly_mensa_scrape",
        replace_existing=True,
    )
    # Small batches keep free-tier inference usage predictable while eventually
    # filling all new menu items after every scrape.
    scheduler.add_job(
        generate_missing_dish_images,
        IntervalTrigger(minutes=settings.dish_image_interval_minutes),
        id="missing_dish_image_generation",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    _scheduler = scheduler
    logger.info(
        "Scheduler started: weekly mensa scrape Monday 06:00 and dish image scan every %d minutes.",
        settings.dish_image_interval_minutes,
    )
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
