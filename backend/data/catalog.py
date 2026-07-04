"""Unified catalog: real Deezer data with graceful mock fallback.

Source is chosen by env var DATA_SOURCE = "deezer" (default) | "mock".
If Deezer is unreachable, we transparently fall back to the mock library so the
app is never dead (resilience — mirrors the LLM fallback philosophy).
"""
from __future__ import annotations

import os
from typing import Dict, List, Optional

from . import deezer_provider as dz
from .models import Track
from .mock_library import TRACK_LIBRARY

_SOURCE = os.getenv("DATA_SOURCE", "deezer").lower()

# Genres exposed when running purely on mock data.
_MOCK_GENRES = [{"id": name, "name": name}
                for name in ["Indie Folk", "Ambient", "Math Rock"]]

# id -> Track, populated lazily as genres are fetched (for /why-line lookups etc.)
_seen: Dict[str, Track] = {t.id: t for t in TRACK_LIBRARY}


def _remember(tracks: List[Track]) -> List[Track]:
    for t in tracks:
        _seen[t.id] = t
    return tracks


def list_genres() -> List[Dict]:
    if _SOURCE == "mock":
        return _MOCK_GENRES
    try:
        return dz.list_genres()
    except dz.DeezerUnavailable:
        return _MOCK_GENRES


def tracks_for_genre(genre: str, limit: int = 100) -> List[Track]:
    """All candidate tracks for a genre (real or mock)."""
    if _SOURCE != "mock":
        try:
            real = dz.tracks_for_genre(genre, limit=limit)
            if real:
                return _remember(real)
        except dz.DeezerUnavailable:
            pass  # fall through to mock
    target = genre.strip().casefold()
    return _remember([t for t in TRACK_LIBRARY
                     if any(g.strip().casefold() == target for g in t.genre_tags)])


def get_track_by_id(track_id: str) -> Optional[Track]:
    return _seen.get(track_id)


def any_track() -> Optional[Track]:
    return next(iter(_seen.values()), None)
