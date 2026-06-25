# Changes since last commit

## Backend

### Database model (`backend/app/models/place.py`)
- Replaced `PlaceType` and `PriceRange` enums with `MealType` (`meal` / `snack`) and `PriceTier` (`<5` / `5-10` / `>10`)
- Dropped the `location` string column — replaced with proper `latitude` / `longitude` float columns
- Added `google_place_id` (unique) for upsert-based seeding and cross-referencing live Google results
- Added `address`, `rating`, `user_rating_count`, `google_maps_uri`, `website_uri` — populated from Google Places at seed time
- Added `meal_type` and `price_tier` — auto-set from Google data, manually overridable
- Added `is_vegan_friendly`, `is_vegetarian_friendly`, `allergens` — left null by default, filled in manually

### Schemas (`backend/app/schemas/place.py`)
- Updated `PlaceBase`, `PlaceCreate`, `PlaceUpdate`, `PlaceRead` to match the new model
- Replaced `NearbyFoodPlace` / `NearbyFoodResponse` with `NearbySearchResult` / `NearbySearchResponse`
- `NearbySearchResult` includes `distance_m` (computed at query time) and `open_now` (live from Google, not stored)

### Search endpoint (`backend/app/api/routes/places.py`)
- `GET /places/nearby-food` now uses a two-step flow:
  1. Calls Google Places to get nearby `google_place_id`s and live `open_now` status (minimal field mask — cheap)
  2. Queries the DB for those IDs to return enriched fields
  3. Auto-inserts minimal stubs for any new places not yet in the DB
- Added filter query params: `meal_type`, `price_tier`, `is_vegan_friendly`, `is_vegetarian_friendly`, `allergens_exclude`
- `GET /places/` also accepts the new filter params
- Results are ordered by Google's popularity ranking and include `distance_m`

### Seed script (`backend/app/scrapers/seed_tuebingen.py`) — new file
- One-time (or periodic) script to populate the DB with all food places in Tübingen
- Uses a 3×3 grid of sub-centers with 2km radius each to work around Google's 20-result-per-call cap
- Upserts on `google_place_id` — safe to re-run; won't overwrite manually set fields
- Run with: `python -m app.scrapers.seed_tuebingen`

### Scrapers (`backend/app/scrapers/`)
- Resolved merge conflicts in `mensa_hungryelk.py` and `mensa_maxplanck.py`
- Fixed `BaseScraper.upsert` to match on `name` instead of the removed `location` column

---

## Web Frontend

### Map (`frontend/src/pages/FoodLookupPage.tsx`)
- Replaced Google Maps JavaScript API embed with **Leaflet + OpenStreetMap** — free, no API key required
- Map still supports click-to-move search center and markers for each result
- No longer fetches a Maps API key from the backend on load

### Layout redesign
- New 3-column layout: filter sidebar | map | results + detail panel
- Filter sidebar with: radius select, meal type toggle (Meal / Snack), price tier toggle (< €5 / €5–10 / > €10), dietary checkboxes (vegan / vegetarian), allergen exclusion checkboxes
- Results list cards show badges for meal type, price tier, dietary; plus rating, open/closed status, distance
- Detail panel shows opening hours, allergen tags, full menu, and links to Google Maps / website

### Services & types
- `placeService.ts`: updated types to match new schema, added filter params to `getNearbyFood`, removed `getMapsConfig` (no longer needed)
- Removed dependency on `Maps JavaScript API` — only `Places API (New)` is needed in the backend `.env`

### Dependencies
- Added `leaflet` and `@types/leaflet`

---

## Android

### Types (`android/src/types/index.ts`)
- Replaced `Location` / `Menu` / `ApiResponse` types with `Place`, `NearbySearchResult`, `NearbyFoodParams`, `MealType`, `PriceTier` — matching the backend schema

### Location service (`android/src/services/locationService.ts`)
- Replaced `getLocations()` with `getNearbyFood(params)` — calls the enriched `/places/nearby-food` endpoint with filter params

### Menu service (`android/src/services/menuService.ts`)
- Removed calls to the non-existent `/menus` endpoint
- Now fetches places with menu data from `/places/nearby-food`

### LocationsScreen (`android/src/screens/LocationsScreen.tsx`)
- Full rewrite: geolocation on load with Tübingen fallback
- Horizontal scrollable filter chip bar: radius, meal type, price tier, vegan, vegetarian
- Second allergen exclusion row
- Results list with badges (meal type, price, vegan) and meta info (rating, open/closed, distance)
- Tap a place to open a full detail modal: rating, status, cuisine, distance, opening hours, allergens, menu, Maps/website links

### MenusScreen (`android/src/screens/MenusScreen.tsx`)
- Rewritten to show places that have menu data populated in the DB
- Shows a helpful empty state if no menus have been added yet
