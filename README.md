# Discovery DJ

A Spotify-style music-discovery MVP. Genre-locked, taste-ranked recommendations
with an AI "why-line" explaining every pick.

- **Backend** — Python / FastAPI (recommendation engine + LLM module). Deploys to **Render** or **Railway**.
- **Frontend** — React + Vite + TypeScript + Tailwind (exact Spotify UI). Deploys to **Vercel**.

```
┌────────────┐   HTTPS    ┌──────────────────┐
│  Vercel    │──────────▶ │ Render / Railway │
│  (React)   │   /recommend│   (FastAPI)      │
└────────────┘   /why-line └──────────────────┘
```

## Run locally

**Backend** (from repo root):
```bash
pip install -r backend/requirements.txt
DATA_SOURCE=mock python3 -m uvicorn backend.api:app --reload --port 8000
```
`DATA_SOURCE=deezer` (default) pulls real catalog data; `mock` uses the bundled library.

**Frontend**:
```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:8000
npm run dev               # http://localhost:5173
```

## Deploy the backend (Render)

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo. It reads [`render.yaml`](render.yaml).
3. After the service is live, set env var **`ALLOWED_ORIGINS`** to your Vercel URL
   (e.g. `https://discovery-dj.vercel.app`). Add `ANTHROPIC_API_KEY` for real
   LLM why-lines (optional — a deterministic fallback runs without it).
4. Note the service URL, e.g. `https://discovery-dj-api.onrender.com`.

**Railway** works the same way via [`railway.json`](railway.json) (or the `Procfile`).
Start command for either: `uvicorn backend.api:app --host 0.0.0.0 --port $PORT`.

## Deploy the frontend (Vercel)

1. Vercel → **New Project** → import the repo.
2. Set **Root Directory** to `frontend`. Framework auto-detects as Vite
   ([`vercel.json`](frontend/vercel.json)).
3. Add env var **`VITE_API_URL`** = your backend URL from the step above.
4. Deploy. Then go back and put the Vercel domain into the backend's
   `ALLOWED_ORIGINS` so CORS allows it.

## Backend env vars

| Var | Default | Purpose |
|-----|---------|---------|
| `ALLOWED_ORIGINS` | `localhost:5173,localhost:4173` | Comma-separated CORS origins (set your Vercel domain) |
| `DATA_SOURCE` | `deezer` | `deezer` (real) or `mock` |
| `ANTHROPIC_API_KEY` | — | Enables LLM why-lines; falls back to templates if unset |

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| GET | `/personas` | Listener profiles |
| GET | `/genres` | Genres to lock onto |
| GET | `/recommend` | Genre-locked, ranked recommendations (`exclude` = endless discovery) |
| POST | `/why-line` | AI explanation for a track |
| POST | `/feedback` | Log SAVE / SKIP / REPLAY |
| GET | `/baseline` | Genre-agnostic "today's Autoplay" for comparison |

## Tests

```bash
python3 -m pytest -q      # 33 passing
```
