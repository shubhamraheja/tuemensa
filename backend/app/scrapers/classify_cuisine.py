"""Backfill cuisine + dietary flags using Groq LLM (name + website text).

Runs after seeding. For each place, fetches the website when available and
sends Groq the place name + website excerpt. Groq returns cuisine,
vegetarian-friendly, and vegan-friendly in one call.

Run with:
    python -m app.scrapers.classify_cuisine

Pass --force to re-classify places that already have values set.
Requires GROQ_API_KEY in backend/.env.
"""

import asyncio
import re
import sys

import httpx
from sqlalchemy import select

from ..core.config import settings
from ..core.database import SessionLocal, init_db
from ..models.place import Place

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

VALID_CUISINES = {
    "Turkish", "Italian", "Indian", "Japanese", "Chinese", "Greek",
    "American", "German", "Mexican", "French", "Spanish", "Thai",
    "Vietnamese", "Korean", "Middle Eastern", "Mediterranean",
    "Lebanese", "Asian",
}

SYSTEM_PROMPT = (
    "You are a food classification assistant. "
    "Always reply with exactly three comma-separated values and nothing else:\n"
    "1. Cuisine — one of: "
    + ", ".join(sorted(VALID_CUISINES))
    + ", or Unknown\n"
    "2. Vegetarian-friendly — Yes or No (can guests easily find vegetarian options?)\n"
    "3. Vegan-friendly — Yes or No (can guests easily find vegan options?)\n\n"
    "Example reply: Turkish, Yes, No\n"
    "Use your knowledge about the cuisine type to make an educated guess "
    "even when no website is provided. For example, Indian restaurants "
    "almost always have vegetarian options; kebab shops rarely have vegan ones."
)


async def _fetch_website_text(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        r = await client.get(url, timeout=8, follow_redirects=True)
        r.raise_for_status()
        text = re.sub(r"<[^>]+>", " ", r.text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:3000]
    except Exception:
        return None


async def _groq_classify(
    client: httpx.AsyncClient, name: str, website_text: str | None
) -> tuple[str | None, bool | None, bool | None]:
    """Returns (cuisine, is_vegetarian_friendly, is_vegan_friendly)."""
    if not settings.groq_api_key:
        return None, None, None

    user_msg = f'Restaurant name: "{name}"'
    if website_text:
        user_msg += f"\n\nWebsite excerpt:\n{website_text}"

    try:
        r = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "max_tokens": 20,
                "temperature": 0,
            },
            timeout=15,
        )
        r.raise_for_status()
        answer = r.json()["choices"][0]["message"]["content"].strip()
        parts = [p.strip() for p in answer.split(",")]
        if len(parts) != 3:
            return None, None, None

        raw_cuisine, raw_veg, raw_vegan = parts

        cuisine = next(
            (label for label in VALID_CUISINES if label.lower() == raw_cuisine.lower()),
            None,
        )
        is_veg = True if raw_veg.lower() == "yes" else (False if raw_veg.lower() == "no" else None)
        is_vegan = True if raw_vegan.lower() == "yes" else (False if raw_vegan.lower() == "no" else None)

        return cuisine, is_veg, is_vegan
    except Exception:
        return None, None, None


async def classify(force: bool = False) -> None:
    if not settings.groq_api_key:
        print("GROQ_API_KEY not set in backend/.env — nothing to do.")
        return

    await init_db()

    async with SessionLocal() as session:
        query = select(Place).where(Place.ignore.is_(False))
        if not force:
            query = query.where(
                Place.cuisine.is_(None)
                | Place.is_vegetarian_friendly.is_(None)
                | Place.is_vegan_friendly.is_(None)
            )
        places = list(await session.scalars(query))

    print(f"Classifying {len(places)} places via Groq ({GROQ_MODEL})…")

    async with httpx.AsyncClient(
        headers={"User-Agent": "TUEMensa/1.0 cuisine-classifier"}
    ) as client:
        async with SessionLocal() as session:
            for place in places:
                website_text = None
                if place.website_uri:
                    website_text = await _fetch_website_text(client, place.website_uri)

                source = "name+website" if website_text else "name only"
                cuisine, is_veg, is_vegan = await _groq_classify(client, place.name, website_text)

                db_place = await session.get(Place, place.id)
                if db_place is None:
                    continue

                if force or db_place.cuisine is None:
                    db_place.cuisine = cuisine
                if force or db_place.is_vegetarian_friendly is None:
                    db_place.is_vegetarian_friendly = is_veg
                if force or db_place.is_vegan_friendly is None:
                    db_place.is_vegan_friendly = is_vegan

                veg = "✓" if is_veg else ("✗" if is_veg is False else "?")
                vegan = "✓" if is_vegan else ("✗" if is_vegan is False else "?")
                print(
                    f"  [{source}] {place.name} → "
                    f"cuisine={cuisine or '?'} veg={veg} vegan={vegan}"
                )

            await session.commit()

    print("Done.")


if __name__ == "__main__":
    force = "--force" in sys.argv
    asyncio.run(classify(force=force))
