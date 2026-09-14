# Setup Guide

Setup is documented per package in the root [README.md](../README.md):

- **Full stack via Docker Compose** — see "Docker Compose" (Postgres + backend + web frontend).
- **Backend** (FastAPI, Python 3.12) — see "Backend".
- **Web frontend** (React + Vite) — see "Frontend".
- **Mobile app** (Expo / React Native) — see "Mobile App", including how to test
  on a physical phone with Expo Go and a Cloudflare quick tunnel for the API.

There is no root-level `package.json`; each package is installed and run from
its own directory (`backend/`, `frontend/`, `mobile/`).
