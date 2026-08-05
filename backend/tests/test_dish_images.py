from app.services.dish_images import _filename, food_photo_prompt
from app.scrapers.run import _preserve_menu_images


def test_food_prompt_is_photographic_and_keeps_dish_name():
    prompt = food_photo_prompt("  Currywurst   mit Pommes ")

    assert "Currywurst mit Pommes" in prompt
    assert "food photography" in prompt
    assert "No people" in prompt


def test_generated_filename_is_stable_and_webp():
    item = {"name": "Currywurst", "day": "Mon", "category": "Main"}

    assert _filename(12, item) == _filename(12, item)
    assert _filename(12, item).endswith(".webp")
    assert _filename(12, item) != _filename(13, item)


def test_scrape_preserves_image_for_same_menu_item():
    old = [{"name": "Pasta", "day": "Mon", "category": "Main", "image_url": "/dish.webp"}]
    fresh = [{"name": " Pasta ", "day": "Mon", "category": "Main"}]

    result = _preserve_menu_images(old, fresh)

    assert result[0]["image_url"] == "/dish.webp"
