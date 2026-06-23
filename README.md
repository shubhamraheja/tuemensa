# Nearby Food Finder

A monorepo for a nearby food lookup app with a Python FastAPI backend, React web frontend, and Android client shell.

```
tuemensa/
├── android/     # React Native Android app
├── backend/     # Python FastAPI backend
└── frontend/    # React web frontend (Vite)
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
| GET | `/places/nearby-food` | Search nearby restaurants, cafes, bakeries, and takeaway spots via Google Places |
| GET | `/places/` | List saved places |
| POST | `/places/` | Create saved place |
| PUT | `/places/{id}` | Update saved place |
| DELETE | `/places/{id}` | Delete saved place |
| GET | `/config/maps` | Return browser Google Maps config |
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

## Android App

React Native 0.73, TypeScript, React Navigation, Zustand, Axios.

```bash
cd android
npm install
npm run android
npm start
```

The Android app talks to the backend at `http://10.0.2.2:8000` when running in an emulator.
