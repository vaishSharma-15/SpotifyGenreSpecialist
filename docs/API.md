# Discovery DJ — API Reference

FastAPI backend (`backend/api.py`). Base URL: `http://localhost:8000` (local) or
your Render/Railway URL in production. Bad input returns `4xx` with a JSON
`{"detail": ...}` — never a `500`.

## Conventions
- **AI endpoints** (`/why-line`, `/adjacency`) call the LLM when a key is set and
  fall back to deterministic logic otherwise — they always return `200`.
- **Deterministic endpoints** (everything else) never touch the LLM.

---

## GET `/health`
Liveness probe. → `{"status": "ok"}`

## GET `/genres`
Genres the user can lock onto. Featured Indian/regional + international labels
first, then Deezer's genres.
→ `{"genres": [{"id": "Bollywood", "name": "Bollywood"}, ...]}`

## GET `/moods`
Moods that can be layered on a genre.
→ `{"moods": [{"id": "Chill", "name": "Chill"}, ...]}` (11 moods)

## GET `/personas`
Preset listener profiles.
→ `{"personas": [{"id": "p1", "name": "Deep Folk Lover", "top_genre": "...", "top_artists": [...]}]}`

## GET `/recommend`  *(deterministic)*
Genre-locked, taste-ranked recommendations.

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `persona_id` | str | — | required; unknown → `404` |
| `locked_genre` | str | — | required |
| `dial_position` | float | `0.5` | `0.0` Safe … `1.0` Adventurous; out of `[0,1]` → `422` |
| `limit` | int | `5` | `1`–`50` |
| `mood` | str | `""` | optional mood filter (e.g. `Chill`) |
| `exclude` | str | `""` | comma-separated track IDs already served (endless discovery) |

→ `{"tracks": [{id, title, artist, album_art_url, genre_tags, popularity_score, sound_descriptors, mood}], "exhausted": bool}`

`exhausted` is `true` when the genre pool is spent — the UI shows a "genre finished"
state instead of looping.

## POST `/why-line`  *(AI + fallback)*
One grounded sentence on why a track fits a persona. Query params `track_id`,
`persona_id`. Unknown ids → `400`.
→ `{"why_line": "..."}`

## GET `/adjacency`  *(AI + fallback)*
Is a deep cut in `candidate_genre` still on-topic for a `user_genre` fan?
Query params `candidate_genre`, `user_genre`.
→ `{"is_adjacent": bool, "reasoning": "..."}`

## POST `/feedback`  *(deterministic)*
Log a user action. Body: `{"persona_id", "track_id", "action"}` where `action` ∈
`SAVE | SKIP | REPLAY`. `SAVE`/`SKIP` also exclude the track from this session.
Invalid action or unknown ids → `400`.
→ `{"status": "logged", "history": [...]}`

## GET `/baseline`  *(deterministic)*
Genre-agnostic "today's Autoplay" for the comparison toggle. Query params
`persona_id`, `locked_genre` (optional).
→ `{"track": {...}, "note": "No explanation (today's Spotify behavior)"}`

---

## Environment
See `backend/.env.example`. Key ones: `DATA_SOURCE` (`deezer`|`mock`),
`ALLOWED_ORIGINS` (CORS), and one LLM key (`GROQ_API_KEY` / `ANTHROPIC_API_KEY` /
`OPENAI_API_KEY`) to enable real AI reasoning.
