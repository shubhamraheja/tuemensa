# TUE Mensa

A monorepo for the TUE Mensa app — Android client, Python backend, and React web frontend.

```
tuemensa/
├── android/     # React Native Android app
├── backend/     # Python FastAPI backend
└── frontend/    # React web frontend (Vite)
```

---

## Android App

React Native 0.73, TypeScript, React Navigation, Zustand, Axios.

```bash
cd android
npm install
npm run android        # run on emulator/device
npm start              # start Metro bundler
```

The app talks to the backend at `http://10.0.2.2:8000` (Android emulator loopback).

**Structure**

```
android/
├── App.tsx
├── index.js
├── src/
│   ├── constants/     # API base URL, endpoints, app config
│   ├── navigation/    # React Navigation bottom tabs
│   ├── screens/       # MenusScreen, LocationsScreen
│   ├── services/      # apiClient, menuService, locationService
│   ├── store/         # Zustand store (filters, selected location, etc.)
│   └── types/         # Shared TypeScript interfaces
└── app/               # Native Android (Kotlin, Gradle)
```

---

## Backend

Python 3.12, FastAPI, MongoDB (via Beanie ODM), JWT auth.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit as needed
uvicorn app.main:app --reload --port 8000
```

For nearby food lookup, set `GOOGLE_MAPS_API_KEY` in `backend/.env`. The key needs access to the Google Places API.

**Endpoints** (all prefixed `/api/v1`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/menus/` | List menus (filter by `date`, `location`) |
| GET | `/menus/{id}` | Get menu |
| POST | `/menus/` | Create menu |
| PUT | `/menus/{id}` | Update menu |
| DELETE | `/menus/{id}` | Delete menu |
| GET | `/locations/` | List locations |
| GET | `/locations/nearby-food` | Find nearby restaurants, cafes, bakeries, or takeaway spots with Google Places |
| POST | `/locations/` | Create location |
| PUT | `/locations/{id}` | Update location |
| DELETE | `/locations/{id}` | Delete location |
| GET | `/health` | Health check |

**Structure**

```
backend/
├── app/
│   ├── main.py
│   ├── core/        # config, database
│   ├── models/      # Beanie documents (Menu, Location)
│   ├── schemas/     # Pydantic request/response models
│   └── api/
│       └── routes/  # menus, locations
└── tests/
```

---

## Frontend

React 18, Vite, TypeScript, React Router v6, Zustand, Axios.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev            # starts at http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`.

**Structure**

```
frontend/
└── src/
    ├── pages/         # MenusPage
    ├── services/      # apiClient, menuService
    └── types/         # Shared TypeScript interfaces
```
