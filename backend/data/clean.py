"""Data-cleaning pass for ingested tracks.

Real search results (Deezer) contain duplicates, blank fields and the odd junk
row. Before a pool reaches the engine we:
  1. drop invalid rows (missing title/artist, placeholder "Unknown")
  2. de-duplicate — by id, and by normalized (title, artist) so the same song
     from different sources/playlists collapses to one
  3. categorize every track by mood (data/mood.py classify_mood)

Genre is already attached at ingestion (genre_tags); this guarantees the second
axis — mood — is always populated, so songs are categorized on both.
"""
from __future__ import annotations

import re
from typing import List

from . import mood as mood_mod
from .models import Track

_PLACEHOLDERS = {"", "unknown", "n/a", "none"}
_ws = re.compile(r"\s+")


def _norm(s: str) -> str:
    return _ws.sub(" ", s.strip().casefold())


def _is_valid(t: Track) -> bool:
    return _norm(t.title) not in _PLACEHOLDERS and _norm(t.artist) not in _PLACEHOLDERS


def clean_tracks(tracks: List[Track]) -> List[Track]:
    """Return validated, de-duplicated, mood-categorized tracks (order preserved)."""
    out: List[Track] = []
    seen_ids: set[str] = set()
    seen_songs: set[tuple[str, str]] = set()
    for t in tracks:
        if not _is_valid(t):
            continue
        key = (_norm(t.title), _norm(t.artist))
        if t.id in seen_ids or key in seen_songs:
            continue
        seen_ids.add(t.id)
        seen_songs.add(key)
        out.append(t)
    return mood_mod.annotate_moods(out)
