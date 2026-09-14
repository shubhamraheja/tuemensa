from abc import ABC, abstractmethod

from ..models.place import Place


class BaseScraper(ABC):
    """A source that produces :class:`Place` rows.

    A scraper fills whatever the source provides (identity, location, opening
    hours, and the weekly ``menu``). Google-only fields (ratings, price, ids)
    are added separately by the enrichment step. ``scrape`` must never raise —
    on failure it should log and return ``[]`` so one broken source doesn't
    block the others.
    """

    #: Human-readable label for logs.
    name: str

    @abstractmethod
    async def scrape(self) -> list[Place]:
        ...
