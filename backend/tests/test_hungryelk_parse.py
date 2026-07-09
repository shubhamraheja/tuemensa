from app.scrapers.mensa_hungryelk import build_menu


def word(text: str, x0: float, top: float, width: float = 60) -> dict:
    return {"text": text, "x0": x0, "x1": x0 + width, "top": top}


def synthetic_grid() -> list[dict]:
    """Two day columns (centers ~630, ~1030), two category rows, plus footer."""
    words = [
        word("MONTAG", 600, 100),
        word("DIENSTAG", 1000, 100),
        # category gutter
        word("SALATBOWL", 90, 200),
        word("DESSERT", 90, 400),
        # SALATBOWL / Monday: dish name, description, allergens, price
        word("Italy", 560, 200), word("Bowl", 625, 200),
        word("Rucola,", 560, 230), word("Parmesan", 625, 230), word("(AW,B)", 700, 230),
        word("6,80", 560, 260), word("€/", 610, 260), word("8,80", 650, 260), word("€", 700, 260),
        # SALATBOWL / Tuesday: placeholder cell -> skipped
        word("Tagesbowl", 960, 200), word("siehe", 1030, 200), word("Aushang", 1080, 200),
        # DESSERT / Monday: per-100g price
        word("Pudding", 560, 400),
        word("1,10", 560, 430), word("€/100g", 610, 430),
        # DESSERT / Tuesday
        word("Solero", 960, 400), word("Traum", 1030, 400), word("(F)", 1090, 400),
        word("2,00", 960, 430), word("€", 1010, 430),
        # footer legend — must be ignored
        word("Allergene", 90, 600), word("AW", 200, 600), word("Gluten", 260, 600),
    ]
    return words


def test_dishes_land_on_their_weekday():
    menu = build_menu(synthetic_grid())
    by_key = {(m["category"], m["day"]): m for m in menu}

    assert ("SALATBOWL", "Mon") in by_key
    assert by_key[("SALATBOWL", "Mon")]["name"] == "Italy Bowl"
    # placeholder cell dropped
    assert ("SALATBOWL", "Tue") not in by_key
    assert ("DESSERT", "Mon") in by_key and ("DESSERT", "Tue") in by_key


def test_prices_allergens_and_per_100g():
    menu = build_menu(synthetic_grid())
    by_key = {(m["category"], m["day"]): m for m in menu}

    bowl = by_key[("SALATBOWL", "Mon")]
    assert bowl["price"] == 6.8  # first (internal) price
    assert bowl["price_per_100g"] is False
    assert bowl["allergens"] == ["AW", "B"]

    pudding = by_key[("DESSERT", "Mon")]
    assert pudding["price"] == 1.1
    assert pudding["price_per_100g"] is True

    solero = by_key[("DESSERT", "Tue")]
    assert solero["price"] == 2.0
    assert solero["allergens"] == ["F"]
    # footer legend words must not leak into any dish
    assert all("Gluten" not in m["name"] for m in menu)


def test_missing_headers_returns_empty():
    assert build_menu([word("SALATBOWL", 90, 200)]) == []
    assert build_menu([]) == []
