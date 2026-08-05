# Nearby Food Finder

A monorepo for a nearby food lookup app with a Python FastAPI backend, React web frontend, and Expo mobile app.

```
tuemensa/
├── backend/     # Python FastAPI backend
├── frontend/    # React web frontend (Vite)
└── mobile/      # Expo (React Native) app
```

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

| Method | Path | Description |
|--------|------|-------------|
| GET | `/places/` | List saved places (filter by `location`, `place_type`) |
| GET | `/places/distances` | Places with live travel distance from `latitude`/`longitude`, nearest first |
| GET | `/places/{id}` | Get one place |
| POST | `/places/` | Create place |
| PUT | `/places/{id}` | Update place |
| DELETE | `/places/{id}` | Delete place |
| POST | `/places/scrape` | Run the mensa scrapers now (debug; disabled in production) |
| GET | `/health` | Health check |

### Generated dish images

When `HUGGINGFACE_TOKEN` is set, the backend scans menu JSON for items without
`image_url`. It sends a food-photography prompt to `black-forest-labs/FLUX.1-schnell`
through Hugging Face Inference Providers (with automatic provider fallback),
stores an optimized WebP under `backend/uploads/dish-images`, and writes the
public `/api/v1/places/dish-images/<file>.webp` URL back into that menu item.
The startup scrape triggers the first batch; APScheduler retries a small batch
every 30 minutes. Tune `DISH_IMAGE_BATCH_SIZE`, `DISH_IMAGE_INTERVAL_MINUTES`,
`HUGGINGFACE_MODEL`, or set `DISH_IMAGE_GENERATION_ENABLED=false` in the backend
environment as needed.

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

The food lookup page opens at `http://localhost:5173`. It starts near Tuebingen, asks for browser location permission when available, lets you click the map to move the search center, and lists nearby food places from Google Places.

## Mobile App

Expo (React Native, TypeScript). Runs on your phone via the Expo Go app — no Android SDK or USB debugging needed.

```bash
cd mobile
npm install
cp .env.example .env
npx expo start --tunnel   # scan the QR with Expo Go (works across networks)
```

To reach the backend from a physical phone, expose it with a free Cloudflare
quick tunnel and put that URL in `mobile/.env`:

```bash
cloudflared tunnel --url http://localhost:8000
# then: EXPO_PUBLIC_API_URL=https://<random>.trycloudflare.com/api/v1
```

`EXPO_PUBLIC_*` vars are inlined at bundle time — restart `expo start` after
changing `.env`. For a quick look without a phone, `npx expo start --web`.
