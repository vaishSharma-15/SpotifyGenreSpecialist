"""Unified catalog: real Deezer data with graceful mock fallback.

Source is chosen by env var DATA_SOURCE = "deezer" (default) | "mock".
If Deezer is unreachable, we transparently fall back to the mock library so the
app is never dead (resilience — mirrors the LLM fallback philosophy).
"""
from __future__ import annotations

import os
from typing import Dict, List, Optional

from . import deezer_provider as dz
from . import mood as mood_mod
from .clean import clean_tracks
from .models import Track
from .mock_library import TRACK_LIBRARY

_SOURCE = os.getenv("DATA_SOURCE", "deezer").lower()

# Curated labels surfaced at the top of the picker. These aren't Deezer chart
# genres — they resolve via keyword search (tracks_for_genre handles that), which
# lets us offer Indian/regional catalogs the Deezer genre list doesn't expose.
_FEATURED_GENRES = [{"id": name, "name": name} for name in [
    # Indian / regional
    "Bollywood", "Punjabi", "Marathi", "Bengali", "Gujarati",
    "Tamil", "Indian Indie", "Indian Classical",
    # Western / international
    "Hollywood", "Jazz", "Brazilian",
]]

# Curated genres are ingested from Deezer EDITORIAL PLAYLISTS (not raw title
# search) so results are actually in-genre. The value is the playlist search
# query; the key stays the exact genre label shown to the user and tagged.
_GENRE_QUERIES = {
    "Bollywood": "bollywood hits",
    "Punjabi": "punjabi hits",
    "Marathi": "marathi superhit songs",
    "Bengali": "bengali hit songs",
    "Gujarati": "gujarati garba hits",
    "Tamil": "tamil hits",
    "Indian Indie": "indian indie",
    "Indian Classical": "indian classical ragas",
    "Hollywood": "hollywood movie soundtracks",
    "Jazz": "jazz classics",
    "Brazilian": "brazilian bossa nova samba",
}

# Genres exposed when running purely on mock data.
_MOCK_GENRES = [{"id": name, "name": name}
                for name in ["Indie Folk", "Ambient", "Math Rock", "Bollywood"]]

# id -> Track, populated lazily as genres are fetched (for /why-line lookups etc.)
# Mock tracks are mood-categorized up front so lookups always carry both axes.
_seen: Dict[str, Track] = {t.id: t for t in mood_mod.annotate_moods(TRACK_LIBRARY)}


def _remember(tracks: List[Track]) -> List[Track]:
    """Clean + categorize a pool, then register it for later id lookups."""
    cleaned = clean_tracks(tracks)
    for t in cleaned:
        _seen[t.id] = t
    return cleaned


def _merge_genres(base: List[Dict]) -> List[Dict]:
    """Featured (Indian/regional) labels first, then the rest, de-duped by name."""
    seen = {g["name"].casefold() for g in _FEATURED_GENRES}
    return _FEATURED_GENRES + [g for g in base if g["name"].casefold() not in seen]


def list_genres() -> List[Dict]:
    if _SOURCE == "mock":
        return _merge_genres(_MOCK_GENRES)
    try:
        return _merge_genres(dz.list_genres())
    except dz.DeezerUnavailable:
        return _merge_genres(_MOCK_GENRES)


def _playable_count(tracks: List[Track]) -> int:
    return sum(1 for t in tracks if t.preview_url)


def _prefer_playable(tracks: List[Track]) -> List[Track]:
    """Keep only tracks that have an audio preview, unless that leaves too few."""
    playable = [t for t in tracks if t.preview_url]
    return playable if len(playable) >= 3 else tracks


def tracks_for_genre(genre: str, limit: int = 100) -> List[Track]:
    """All candidate tracks for a genre (real or mock), tagged with the exact genre.

    Curated labels ingest from editorial playlists (cleanest in-genre pool), but we
    pick whichever source yields the most PLAYABLE tracks — some older playlists
    have no 30s previews, and a song you can't play is useless here.
    Always falls back to the mock library so the app is never dead.
    """
    if _SOURCE != "mock":
        try:
            query = _GENRE_QUERIES.get(genre)
            sources = []
            if query:
                sources.append(lambda: dz.tracks_via_playlist(query, genre, limit=limit))
                sources.append(lambda: dz.tracks_for_query(query, genre, limit=limit))
            sources.append(lambda: dz.tracks_for_genre(genre, limit=limit))

            best: List[Track] = []
            best_playable = -1
            for src in sources:
                got = src()
                pc = _playable_count(got)
                if pc > best_playable:
                    best, best_playable = got, pc
                if pc >= 5:  # plenty playable — stop early, keep it in-genre
                    break
            if best:
                return _remember(_prefer_playable(best))
        except dz.DeezerUnavailable:
            pass  # fall through to mock
    target = genre.strip().casefold()
    return _remember([t for t in TRACK_LIBRARY
                     if any(g.strip().casefold() == target for g in t.genre_tags)])


def list_moods() -> List[Dict]:
    return mood_mod.list_moods()


def tracks_for_genre_mood(genre: str, mood: str, limit: int = 100) -> List[Track]:
    """Candidate tracks for a genre filtered/curated by mood (real or mock).

    Ingestion order (each step falls back to the next — never dead):
      1. Real Deezer editorial mood playlist for the genre.
      2. Real Deezer genre chart, then descriptor-filtered to the mood target.
      3. Mock library for the genre, descriptor-filtered to the mood target.
    """
    if not mood or not mood_mod.is_mood(mood):
        return tracks_for_genre(genre, limit=limit)  # no/invalid mood -> genre only

    if _SOURCE != "mock":
        try:
            # 1. A genre+mood editorial playlist ("Chill Bollywood") is the best fit
            #    — but only if enough of its tracks are actually playable.
            curated = dz.tracks_for_genre_mood(
                genre, mood_mod.keywords_for(mood), mood, limit=limit)
            if curated and _playable_count(curated) >= 3:
                return _remember(_prefer_playable(curated))
        except dz.DeezerUnavailable:
            pass  # fall through to descriptor filtering below

    # 2. No genre+mood playlist: take the exact-genre pool and descriptor-filter
    #    it to the mood target. Works for both real and mock sources.
    pool = tracks_for_genre(genre, limit=max(limit * 3, 60))
    return mood_mod.filter_by_mood(pool, mood, limit)


def get_track_by_id(track_id: str) -> Optional[Track]:
    return _seen.get(track_id)


def any_track() -> Optional[Track]:
    return next(iter(_seen.values()), None)
