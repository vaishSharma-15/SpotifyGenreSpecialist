"""FastAPI backend wiring engine + LLM. Bad input -> 4xx, never 500 (edge case §3)."""
from __future__ import annotations

import os
import random

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .data import catalog
from .data.feedback_store import get_feedback, save_feedback
from .data.mock_library import LISTENER_PERSONAS, get_persona_by_id
from .engine.novelty_manager import NoveltyManager
from .engine.recommendation import get_recommendations
from .llm.client import generate_why, judge_genre_adjacency

app = FastAPI(title="Discovery DJ API")

# edge case 3.5: origins are configurable. Set ALLOWED_ORIGINS to a
# comma-separated list (e.g. your Vercel domain) in production.
_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}

_novelty = NoveltyManager()


def _track_json(t):
    return {
        "id": t.id, "title": t.title, "artist": t.artist,
        "album_art_url": t.album_art_url, "genre_tags": t.genre_tags,
        "popularity_score": t.popularity_score, "sound_descriptors": t.sound_descriptors,
    }


@app.get("/genres")
def genres():
    """Real genre list the user picks from (Deezer, or mock fallback)."""
    return {"genres": catalog.list_genres()}


@app.get("/moods")
def moods():
    """Moods the user can layer on top of a genre (energy/valence targets)."""
    return {"moods": catalog.list_moods()}


@app.get("/personas")
def list_personas():
    return {"personas": [
        {"id": p.id, "name": p.name, "top_genre": p.top_genre, "top_artists": p.top_artists}
        for p in LISTENER_PERSONAS
    ]}


@app.get("/recommend")
def recommend(
    persona_id: str,
    locked_genre: str,
    dial_position: float = Query(0.5, ge=0.0, le=1.0),  # edge cases 1.5/3.4
    limit: int = Query(5, ge=1, le=50),
    mood: str = Query("", description="Optional mood filter (e.g. Chill, Energetic, Happy)"),
    exclude: str = Query("", description="Comma-separated track IDs already served (endless discovery)"),
):
    """Genre-locked (and optionally mood-filtered) recommendations from real data.

    `exclude` carries the IDs already shown so that when a playlist/queue finishes
    the client can call again and get the next batch of the SAME genre (endless
    discovery) with no repeats.
    """
    persona = get_persona_by_id(persona_id)
    if persona is None:  # edge case 3.1
        raise HTTPException(404, f"Unknown persona: {persona_id}")

    if mood:
        candidates = catalog.tracks_for_genre_mood(locked_genre, mood, limit=100)
    else:
        candidates = catalog.tracks_for_genre(locked_genre, limit=100)
    served = {s for s in exclude.split(",") if s}
    excluded = set(persona.recently_played) | _novelty.get_excluded(persona_id) | served

    recs = get_recommendations(persona, locked_genre, dial_position, excluded, limit,
                               candidate_tracks=candidates)
    # exhausted flag lets the UI show a 'genre finished' state instead of looping
    return {"tracks": [_track_json(t) for t in recs], "exhausted": len(recs) == 0}


@app.post("/why-line")
def why_line(track_id: str, persona_id: str):
    track = catalog.get_track_by_id(track_id)
    persona = get_persona_by_id(persona_id)
    if track is None:  # edge case 3.2
        raise HTTPException(400, f"Unknown track: {track_id}")
    if persona is None:  # edge case 3.1
        raise HTTPException(400, f"Unknown persona: {persona_id}")
    return {"why_line": generate_why(track, persona)}


@app.get("/adjacency")
def adjacency(candidate_genre: str, user_genre: str):
    """LLM genre-adjacency judgment: is a deep cut in `candidate_genre` still
    'on-topic' for a `user_genre` fan? Degrades to a rule-based map without a key."""
    is_adjacent, reasoning = judge_genre_adjacency(candidate_genre, user_genre)
    return {"is_adjacent": is_adjacent, "reasoning": reasoning}


class Feedback(BaseModel):
    persona_id: str
    track_id: str
    action: str


@app.post("/feedback")
def feedback(body: Feedback):
    if get_persona_by_id(body.persona_id) is None:
        raise HTTPException(400, f"Unknown persona: {body.persona_id}")
    if catalog.get_track_by_id(body.track_id) is None:
        raise HTTPException(400, f"Unknown track: {body.track_id}")
    try:
        save_feedback(body.persona_id, body.track_id, body.action)  # validates action (3.3)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if body.action in ("SAVE", "SKIP"):
        _novelty.mark_skip(body.persona_id, body.track_id)
    return {"status": "logged", "history": get_feedback(body.persona_id)}


@app.get("/baseline")
def baseline(persona_id: str, locked_genre: str = ""):
    # Genre-agnostic 'today's Autoplay': pull from a broad pool, ignore the lock.
    pool = catalog.tracks_for_genre(locked_genre, limit=50) if locked_genre else []
    if not pool:
        t = catalog.any_track()
    else:
        t = random.choice(pool)
    if t is None:  # edge case 3.7
        raise HTTPException(400, "Library is empty")
    return {"track": _track_json(t), "note": "No explanation (today's Spotify behavior)"}
