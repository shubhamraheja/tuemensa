"""Background generation and local storage for menu-item food photography."""

from __future__ import annotations

import asyncio
import hashlib
import io
import logging
from pathlib import Path
from urllib.parse import quote

import httpx
from PIL import Image, UnidentifiedImageError
from huggingface_hub import InferenceClient
from sqlalchemy import select

from ..core.config import settings
from ..core.database import SessionLocal
from ..models.place import Place

logger = logging.getLogger(__name__)

DISH_IMAGE_DIR = Path(__file__).resolve().parents[2] / "uploads" / "dish-images"
DISH_IMAGE_DIR.mkdir(parents=True, exist_ok=True)


class ImageGenerationError(RuntimeError):
    """An image-provider failure, optionally retaining an HTTP status."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def food_photo_prompt(description: str) -> str:
    """Turn unstructured menu text into a constrained editorial food prompt."""
    clean_description = " ".join(description.split())[:500]
    return (
        "Professional editorial food photography of the dish: "
        f"{clean_description}. Served on a simple ceramic plate, appetising and "
        "realistic, natural soft light, overhead three-quarter composition, "
        "high detail. No people, no cutlery, no labels, no text, no watermark."
    )


def _filename(place_id: int, item: dict) -> str:
    identity = "|".join(
        [
            str(place_id),
            str(item.get("name", "")),
            str(item.get("day") or ""),
            str(item.get("category") or ""),
        ]
    )
    return f"{place_id}-{hashlib.sha256(identity.encode()).hexdigest()[:20]}.webp"


def _decode_image(raw: bytes) -> Image.Image:
    """Decode provider image bytes while the network response is still open."""
    try:
        with Image.open(io.BytesIO(raw)) as image:
            return image.copy()
    except (UnidentifiedImageError, OSError) as exc:
        raise RuntimeError("Image provider returned data that is not an image") from exc


def _request_huggingface_image(prompt: str) -> Image.Image:
    """Generate through Hugging Face's current Inference Providers API.

    ``provider='auto'`` routes FLUX to an available image provider instead of
    the retired legacy ``hf-inference`` route.
    """
    client = InferenceClient(
        api_key=settings.huggingface_token,
        provider=settings.huggingface_provider,
        timeout=90,
    )
    return client.text_to_image(prompt, model=settings.huggingface_model)


def _request_cloudflare_image(prompt: str) -> Image.Image:
    """Generate with Cloudflare Workers AI's SDXL-Lightning REST endpoint."""
    if not settings.cloudflare_account_id or not settings.cloudflare_workers_ai_token:
        raise RuntimeError("Cloudflare Workers AI is not configured")
    model = quote(settings.cloudflare_workers_ai_model, safe="@/")
    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{settings.cloudflare_account_id}/ai/run/{model}"
    )
    with httpx.Client(timeout=90.0) as client:
        response = client.post(
            url,
            headers={"Authorization": f"Bearer {settings.cloudflare_workers_ai_token}"},
            json={
                "prompt": prompt,
                "negative_prompt": "text, watermark, logo, people",
                "width": 1024,
                "height": 768,
                "num_steps": 8,
            },
        )
    response.raise_for_status()
    return _decode_image(response.content)


def _request_pollinations_image(prompt: str) -> Image.Image:
    """Generate with Pollinations' authenticated image endpoint."""
    if not settings.pollinations_api_key:
        raise RuntimeError("Pollinations is not configured")
    url = f"https://gen.pollinations.ai/image/{quote(prompt, safe='')}"
    with httpx.Client(timeout=90.0) as client:
        response = client.get(
            url,
            headers={"Authorization": f"Bearer {settings.pollinations_api_key}"},
            params={"model": settings.pollinations_model, "width": 1024, "height": 768},
        )
    response.raise_for_status()
    return _decode_image(response.content)


def _request_image(prompt: str) -> Image.Image:
    """Use configured image providers in order, retaining the last failure."""
    attempts: list[tuple[str, object]] = []
    if settings.huggingface_token:
        attempts.append(("Hugging Face", _request_huggingface_image))
    if settings.cloudflare_account_id and settings.cloudflare_workers_ai_token:
        attempts.append(("Cloudflare Workers AI", _request_cloudflare_image))
    if settings.pollinations_api_key:
        attempts.append(("Pollinations", _request_pollinations_image))
    if not attempts:
        raise RuntimeError("No image generation provider is configured")

    failures: list[str] = []
    status_codes: list[int] = []
    for provider_name, provider in attempts:
        try:
            return provider(prompt)  # type: ignore[operator]
        except Exception as exc:  # noqa: BLE001 - try the next provider
            logger.warning("%s image generation failed: %s", provider_name, exc)
            failures.append(f"{provider_name}: {exc}")
            response = getattr(exc, "response", None)
            status_code = getattr(response, "status_code", None)
            if status_code:
                status_codes.append(status_code)
    raise ImageGenerationError(
        "All image providers failed: " + " | ".join(failures),
        402 if 402 in status_codes else (status_codes[-1] if status_codes else None),
    )


def _write_webp(source: Image.Image, destination: Path) -> None:
    """Validate a generated image and write a compact, browser-friendly WebP file."""
    try:
        image = source.convert("RGB")
        image.thumbnail(
            (settings.dish_image_max_dimension, settings.dish_image_max_dimension),
            Image.Resampling.LANCZOS,
        )
        image.save(destination, "WEBP", quality=84, method=6)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise RuntimeError("Hugging Face response could not be decoded as an image") from exc


async def generate_missing_dish_images() -> dict[str, int | bool]:
    """Generate a bounded batch of missing menu images, then persist their URLs.

    The job intentionally leaves a failed item without ``image_url`` so a later
    scheduled run can retry it. It is a no-op unless explicitly configured with
    ``HUGGINGFACE_TOKEN``.
    """
    if not settings.dish_image_generation_enabled or not settings.huggingface_token:
        logger.info("Dish image generation skipped: no Hugging Face token or feature disabled")
        return {"enabled": False, "generated": 0, "failed": 0, "scanned": 0}

    generated = failed = scanned = 0
    async with SessionLocal() as session:
        places = (
            await session.scalars(select(Place).where(Place.ignore.is_(False)))
        ).all()
        for place in places:
            # Copy JSON entries before changing them: SQLAlchemy cannot observe
            # an in-place mutation inside a plain JSON column.
            menu = [dict(item) for item in (place.menu or [])]
            for item in menu:
                # Count failures too, otherwise an unavailable provider could
                # cause one scheduled run to hammer every missing menu item.
                if generated + failed >= settings.dish_image_batch_size:
                    await session.commit()
                    return {
                        "enabled": True,
                        "generated": generated,
                        "failed": failed,
                        "scanned": scanned,
                    }
                if item.get("image_url") or not str(item.get("name", "")).strip():
                    continue
                scanned += 1
                filename = _filename(place.id, item)
                output = DISH_IMAGE_DIR / filename
                try:
                    # Reuse an already-written file after a process crash before DB commit.
                    if not output.exists():
                        generated_image = await asyncio.to_thread(
                            _request_image, food_photo_prompt(item["name"])
                        )
                        _write_webp(generated_image, output)
                    item["image_url"] = f"/api/v1/places/dish-images/{filename}"
                    place.menu = menu
                    generated += 1
                    await session.commit()
                    logger.info("Generated dish image for %s / %s", place.name, item["name"])
                except Exception as exc:  # noqa: BLE001 - one provider failure must not halt the queue
                    failed += 1
                    logger.exception(
                        "Could not generate dish image for %s / %s",
                        place.name,
                        item.get("name"),
                    )
                    # A depleted Hugging Face account cannot recover until the
                    # user adds credits, so don't burn every scheduled batch on
                    # the same provider response.
                    response = getattr(exc, "response", None)
                    status_code = getattr(exc, "status_code", None) or getattr(
                        response, "status_code", None
                    )
                    if status_code == 402:
                        logger.warning(
                            "Dish generation paused: Hugging Face inference credits are exhausted"
                        )
                        await session.commit()
                        return {
                            "enabled": True,
                            "generated": generated,
                            "failed": failed,
                            "scanned": scanned,
                        }
        await session.commit()
    return {"enabled": True, "generated": generated, "failed": failed, "scanned": scanned}
