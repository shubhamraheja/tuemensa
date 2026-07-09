from app.scrapers.mensa_maxplanck import (
    MaxPlanckHausScraper,
    _clean,
    _extract_allergens,
)

FIXTURE_HTML = """
<html><body>
<table>
  <tr>
    <td>Quick &amp; Easy</td><td></td>
    <td>Main Course Meat / Fish</td>
    <td>Main Course vegan / veggie</td>
    <td>Side Dishes (Vegetables included)</td>
    <td>Dessert</td>
  </tr>
  <tr>
    <td>Choice of the Day</td>
    <td>Monday</td>
    <td>Thuringian grilled sausage with gravy (20/8/i) 1,49€/100g</td>
    <td>Vegan curry (f,i,a1) 1,43€/100g</td>
    <td>Mashed potatoes (hausgemacht)</td>
    <td>Homemade Tiramisu (20,g,17,a1)</td>
  </tr>
  <tr>
    <td>Summer Bowl 7,50€ : Bulgur, Watermelon (a1/g)</td>
    <td>Tuesday</td>
    <td>Chicken thighs with BBQ dip (f/2) 1,56€/100g</td>
    <td>Chili sin carne (g/a1/i) 1,38€/100g</td>
    <td>Steakhouse Fries</td>
    <td>Elderflower mousse (f)</td>
  </tr>
</table>
</body></html>
"""


def _parse_fixture():
    return MaxPlanckHausScraper()._parse(FIXTURE_HTML)


def test_codes_extracted_and_stripped_from_name():
    menu = _parse_fixture()
    meat = next(
        m for m in menu if m["day"] == "Mon" and m["category"] == "Main Course Meat / Fish"
    )
    # numeric additives (20, 8) dropped, letter code kept
    assert meat["allergens"] == ["i"]
    assert meat["price"] == 1.49
    assert meat["name"] == "Thuringian grilled sausage with gravy"


def test_mixed_comma_group_and_price():
    menu = _parse_fixture()
    vegan = next(
        m
        for m in menu
        if m["day"] == "Mon" and m["category"] == "Main Course vegan / veggie"
    )
    assert vegan["allergens"] == ["a1", "f", "i"]
    assert vegan["price"] == 1.43
    assert "(" not in vegan["name"] and "/100g" not in vegan["name"]

    dessert = next(m for m in menu if m["day"] == "Mon" and m["category"] == "Dessert")
    assert dessert["allergens"] == ["a1", "g"]
    assert dessert["name"] == "Homemade Tiramisu"


def test_plain_word_parenthetical_survives():
    menu = _parse_fixture()
    sides = next(m for m in menu if m["day"] == "Mon" and m["category"] == "Side Dishes")
    assert sides["allergens"] == []
    assert "(hausgemacht)" in sides["name"]


def test_choice_of_the_day_special_row():
    menu = _parse_fixture()
    special = next(m for m in menu if m["category"] == "Choice of the Day")
    assert special["day"] == "Tue"
    assert special["price"] == 7.5
    assert special["allergens"] == ["a1", "g"]
    assert special["name"].startswith("Summer Bowl")


def test_helpers_directly():
    assert _extract_allergens("Dish (g/a1) and (20,8)") == ["a1", "g"]
    assert _extract_allergens("No codes here (homemade)") == []
    assert _clean("Dish (g/a1) 5,50€/100g") == "Dish"
