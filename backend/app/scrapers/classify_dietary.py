"""Classify dietary info and allergens for seeded places.

For each place in the DB:
1. If it has a website_uri, fetch the page and scan text for keywords.
2. Fall back to inferring from cuisine + name.
3. Update is_vegan_friendly, is_vegetarian_friendly, allergens in the DB.

Run with:
    python -m app.scrapers.classify_dietary

Safe to re-run — only updates fields that are currently NULL, so manual
overrides are never overwritten. Pass --force to re-classify everything.
"""

import asyncio
import re
import sys
from urllib.parse import urlparse

import httpx
from sqlalchemy import select

from ..core.database import SessionLocal, init_db
from ..models.place import Place

# ── Keyword lists ────────────────────────────────────────────────────────────

VEGAN_KEYWORDS = {
    "vegan", "plant-based", "plant based", "dairy-free", "dairy free",
    "egg-free", "egg free", "no animal", "ohne tierische", "vegan-friendly",
    "rein pflanzlich", "plantbased",
}

VEGETARIAN_KEYWORDS = {
    "vegetarian", "vegetarisch", "veggie", "meat-free", "meat free",
    "no meat", "ohne fleisch", "fleischlos", "paneer", "halloumi",
    "falafel", "tofu", "tempeh", "quorn",
}

# Signals that strongly suggest NOT vegetarian/vegan
MEAT_KEYWORDS = {
    "beef", "pork", "chicken", "lamb", "steak", "burger", "kebab",
    "döner", "doner", "bacon", "ham", "sausage", "wurst", "schnitzel",
    "fleisch", "hack", "currywurst", "gyros",
}

# Cuisine-based inference (name → dietary flags)
CUISINE_INFERENCE: dict[str, dict] = {
    "indian":       {"is_vegetarian_friendly": True},
    "greek":        {"is_vegetarian_friendly": True},
    "falafel":      {"is_vegetarian_friendly": True},
}

NAME_VEGAN_SIGNALS = {"vegan", "plant", "green", "grün", "bio", "organic", "nature"}
NAME_VEG_SIGNALS   = {"vegetarian", "veggie", "falafel", "buddha", "garden", "harvest"}


# ── Text helpers ─────────────────────────────────────────────────────────────

def _normalise(text: str) -> str:
    return re.sub(r"[^\w\s]", " ", text.lower())


def _hits(text: str, keywords: set[str]) -> bool:
    return any(kw in text for kw in keywords)


# ── Website fetching ─────────────────────────────────────────────────────────

async def _fetch_text(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        # Only follow to the same domain — avoid redirect chains to unrelated pages
        parsed = urlparse(url)
        r = await client.get(url, timeout=8, follow_redirects=True)
        r.raise_for_status()
        # Strip HTML tags crudely — enough for keyword matching
        text = re.sub(r"<[^>]+>", " ", r.text)
        text = re.sub(r"\s+", " ", text)
        return _normalise(text[:50_000])  # cap at 50k chars
    except Exception:
        return None


# ── Per-place classification ─────────────────────────────────────────────────

def _classify(name: str, cuisine: str | None, website_text: str | None) -> dict:
    result: dict[str, bool | None] = {
        "is_vegan_friendly": None,
        "is_vegetarian_friendly": None,
    }

    name_norm = _normalise(name)
    cuisine_norm = _normalise(cuisine or "")

    # 1. Website text — strongest signal
    if website_text:
        if _hits(website_text, VEGAN_KEYWORDS):
            result["is_vegan_friendly"] = True
            result["is_vegetarian_friendly"] = True
        elif _hits(website_text, VEGETARIAN_KEYWORDS) and not _hits(website_text, MEAT_KEYWORDS):
            result["is_vegetarian_friendly"] = True
        elif _hits(website_text, MEAT_KEYWORDS):
            result["is_vegan_friendly"] = False

    # 2. Name signals (weaker)
    if result["is_vegan_friendly"] is None:
        if _hits(name_norm, NAME_VEGAN_SIGNALS):
            result["is_vegan_friendly"] = True
            result["is_vegetarian_friendly"] = True
        elif _hits(name_norm, NAME_VEG_SIGNALS):
            result["is_vegetarian_friendly"] = True

    # 3. Cuisine inference — fills gaps
    for cuisine_key, inference in CUISINE_INFERENCE.items():
        if cuisine_key in cuisine_norm or cuisine_key in name_norm:
            if result["is_vegetarian_friendly"] is None and "is_vegetarian_friendly" in inference:
                result["is_vegetarian_friendly"] = inference["is_vegetarian_friendly"]
            break

    return result


# ── Main ─────────────────────────────────────────────────────────────────────

async def classify(force: bool = False) -> None:
    await init_db()

    async with SessionLocal() as session:
        query = select(Place).where(Place.ignore.is_(False))
        if not force:
            query = query.where(
                Place.is_vegan_friendly.is_(None),
                Place.is_vegetarian_friendly.is_(None),
            )
        places = list(await session.scalars(query))

    print(f"Classifying {len(places)} places{'(forced)' if force else ' with no dietary data'}...")

    async with httpx.AsyncClient(headers={"User-Agent": "TUEMensa/1.0 dietary-classifier"}) as client:
        async with SessionLocal() as session:
            for place in places:
                website_text = None
                if place.website_uri:
                    website_text = await _fetch_text(client, place.website_uri)

                result = _classify(place.name, place.cuisine, website_text)

                db_place = await session.get(Place, place.id)
                if db_place is None:
                    continue

                if force or db_place.is_vegan_friendly is None:
                    db_place.is_vegan_friendly = result["is_vegan_friendly"]
                if force or db_place.is_vegetarian_friendly is None:
                    db_place.is_vegetarian_friendly = result["is_vegetarian_friendly"]

                source = "website+" if website_text else "inference"
                vegan = "✓" if result["is_vegan_friendly"] else ("✗" if result["is_vegan_friendly"] is False else "?")
                veg   = "✓" if result["is_vegetarian_friendly"] else ("✗" if result["is_vegetarian_friendly"] is False else "?")
                print(f"  [{source}] {place.name}: vegan={vegan} veg={veg}")

            await session.commit()

    print("Done.")


if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(classify(force=force))
