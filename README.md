# TüEats — Nearby Food Finder

A monorepo for **TüEats**, a lunch decision-making app that combines Tübingen Mensa menus with nearby food options. The product provides a quick, visual way for students to decide what and where to eat.

```text
tuemensa/
├── backend/     # Python FastAPI backend
├── frontend/    # React web frontend (Vite)
└── mobile/      # Expo (React Native) app
```

## Product Overview

### 1. Product name

**TüEats**

TüEats is a lunch decision-making application for students in Tübingen.

### 2. Short description

TüEats brings **Mensa dishes and nearby food options together in one application**.

Users can browse today's Mensa dishes through a swipe-based card interface, view information such as prices and allergens, and discover alternative restaurants nearby through a map and list view.

The product is designed to make the everyday lunch decision **faster, more visual, and easier to navigate**.

### 3. Intended target group

The primary target group is **students in Tübingen**, particularly students who regularly need to decide where and what to eat for lunch.

The initial research focused on students using the Mensas around **Morgenstelle, Wilhelmstraße, and Prinz Karl**.

### 4. Main problem addressed

Students have to make a lunch decision but may need to check different sources to compare Mensa dishes and alternative food options.

Our initial project idea was a Mensa food rating system. After user research and feedback from the Studierendenwerk, we changed direction and focused on the broader decision-making problem:

> **How might we help students make quick lunch decisions, whether choosing today's best Mensa option or finding alternative spots nearby?**

TüEats addresses this by combining food information, visual browsing, filters, and nearby-place discovery in one product.

### 5. Main user workflow

The main user flow is:

```text
Open TüEats
      ↓
See today's food options
      ↓
Browse Mensa dishes
      ↓
Review dish information
(photo, name, price, allergens, location/distance)
      ↓
Swipe through dishes
      ↓
 ┌───────────────┐
 │               │
 │ Like a dish?  │
 │               │
 └───────┬───────┘
         │
    Yes  │  No / want alternatives
         ↓
   Choose dish       Open nearby food
                         ↓
                   View map / list
                         ↓
                   Compare nearby places
                         ↓
                   Choose where to eat
```

The two main decision modes are:

* **Swipe mode:** Quickly browse and react to today's dishes.
* **Nearby mode:** Explore restaurants and other food options around the user.

Filters can be used for preferences such as **vegetarian, vegan, and allergies**.

### 6. Current state of the prototype

TüEats currently exists as a **working multi-platform prototype** with:

* a React/Vite web frontend,
* a React Native/Expo mobile application,
* a Python/FastAPI backend,
* a PostgreSQL database,
* Mensa menu data from sources including OpenMensa, Hungry Elk, and Max Planck,
* Google Places, Routes, and Maps Photo API integration,
* a swipe-based dish-card interface,
* nearby food discovery through map/list views,
* dish images with generated-image support,
* image caching and fallback behavior,
* and an API for retrieving and managing nearby places.

The mobile application can be tested through **Expo Go**, while the web application can be run locally through Vite.

The prototype has been hosted for user testing and can currently be distributed as an APK. Broader public distribution and production deployment are not yet finalized.

### 7. Known limitations / unfinished parts

The prototype is functional, but several areas still require further development:

* **Data completeness:** It is difficult to provide complete and consistent information for every possible food option.
* **Personalized recommendations:** Similar dishes can have different names, making reliable personalization difficult.
* **Image generation:** Generated dish images depend on external AI providers and require API credentials and processing time.
* **External APIs:** The application depends on external services such as Google APIs and image-generation providers.
* **Maintenance:** Menus, places, images, and local recommendations need ongoing maintenance.
* **Local tips:** Additional local recommendations require administration.
* **Hosting:** A long-term hosting solution still needs to be established.
* **Distribution:** Google Play publication has not yet been finalized.
* **GDPR:** Requirements for broader public deployment still need to be clarified and addressed.
* **User adoption:** Further testing is needed to determine whether students would regularly use TüEats instead of established food and map applications.

---

## Docker Compose

Create a root `.env` file with your Google Maps key. To generate menu-item
photos, also create a Hugging Face access token with Inference Providers access:

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
HUGGINGFACE_TOKEN=hf_your_token_here
```

Then run the full stack:

```bash
docker compose up --build
```

The web app runs at `http://localhost:5173`, and the backend runs at `http://localhost:8000`.

The frontend proxies `/api` to the backend container, so browser requests stay on the same local origin during development.

## Backend

Python 3.12, FastAPI, PostgreSQL, and Google Places API.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Endpoints are prefixed with `/api/v1`.

| Method | Path                | Description                                                                 |
| ------ | ------------------- | --------------------------------------------------------------------------- |
| GET    | `/places/`          | List saved places (filter by `location`, `place_type`)                      |
| GET    | `/places/distances` | Places with live travel distance from `latitude`/`longitude`, nearest first |
| GET    | `/places/{id}`      | Get one place                                                               |
| POST   | `/places/`          | Create place                                                                |
| PUT    | `/places/{id}`      | Update place                                                                |
| DELETE | `/places/{id}`      | Delete place                                                                |
| POST   | `/places/scrape`    | Run the mensa scrapers now (debug; disabled in production)                  |
| GET    | `/health`           | Health check                                                                |

### Generated dish images

When `HUGGINGFACE_TOKEN` is set, the backend scans menu JSON for items without
`image_url`. It sends a food-photography prompt to
`black-forest-labs/FLUX.1-schnell` through Hugging Face Inference Providers
(with automatic provider fallback), stores an optimized WebP under
`backend/uploads/dish-images`, and writes the public
`/api/v1/places/dish-images/<file>.webp` URL back into that menu item.

The startup scrape triggers the first batch; APScheduler retries a small batch
every 30 minutes. Tune `DISH_IMAGE_BATCH_SIZE`,
`DISH_IMAGE_INTERVAL_MINUTES`, `HUGGINGFACE_MODEL`, or set
`DISH_IMAGE_GENERATION_ENABLED=false` in the backend environment as needed.

### Provider fallback

Generation tries Hugging Face first, then Cloudflare Workers AI when both
variables below are set, and finally Pollinations when its API key is set:

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_WORKERS_AI_TOKEN=your_workers_ai_token
POLLINATIONS_API_KEY=your_pollinations_server_key
```

Cloudflare uses `@cf/bytedance/stable-diffusion-xl-lightning`, a fast image
model. Pollinations' current API requires an API key; it is therefore disabled
unless `POLLINATIONS_API_KEY` is supplied.

## Frontend

React 18, Vite, TypeScript, React Router v6, Axios, and Google Maps JavaScript API.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The food lookup page opens at `http://localhost:5173`. It starts near Tuebingen,
asks for browser location permission when available, lets you click the map to
move the search center, and lists nearby food places from Google Places.

## Mobile App

Expo (React Native, TypeScript). Runs on your phone via the Expo Go app — no
Android SDK or USB debugging needed.

```bash
cd mobile
npm install
cp .env.example .env
npx expo start --tunnel
```

Scan the QR code with Expo Go. The tunnel allows the application to work across
different networks.

To reach the backend from a physical phone, expose it with a free Cloudflare
quick tunnel and put that URL in `mobile/.env`:

```bash
cloudflared tunnel --url http://localhost:8000
# then:
EXPO_PUBLIC_API_URL=https://<random>.trycloudflare.com/api/v1
```

`EXPO_PUBLIC_*` variables are inlined at bundle time, so restart
`expo start` after changing `.env`.

For a quick look without a phone:

```bash
npx expo start --web
```
