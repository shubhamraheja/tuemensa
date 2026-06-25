"""APScheduler setup: refresh the mensa menus weekly on Monday morning."""

from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from ..scrapers.run import scrape_all

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> AsyncIOScheduler:
    """Start the in-process scheduler (weekly Monday menu refresh)."""
    global _scheduler
    scheduler = AsyncIOScheduler(timezone="Europe/Berlin")
    scheduler.add_job(
        scrape_all,
        CronTrigger(day_of_week="mon", hour=6, minute=0),
        kwargs={"enrich": False},  # menus only; Google enrichment runs at startup
        id="weekly_mensa_scrape",
        replace_existing=True,
    )
    scheduler.start()
    _scheduler = scheduler
    logger.info("Scheduler started: weekly mensa scrape every Monday 06:00 Europe/Berlin.")
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
