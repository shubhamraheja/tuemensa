# Nearby Food Finder

A monorepo for a nearby food lookup app with a Python FastAPI backend, React web frontend, and Expo mobile app.

```
tuemensa/
├── backend/     # Python FastAPI backend
├── frontend/    # React web frontend (Vite)
└── mobile/      # Expo (React Native) app
```

## Docker Compose

Create a root `.env` file with your Google Maps key:

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
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
