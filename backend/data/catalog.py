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

# A tight, curated genre list — every one is recognizable and returns real,
# playable, in-genre songs from a Deezer editorial playlist. The value is the
# playlist search query; the key is the exact label shown to the user and tagged.
_GENRE_QUERIES = {
    "Pop": "pop hits",
    "Bollywood": "bollywood hits",
    "Hip-Hop": "hip hop hits",
    "Rock": "rock hits",
    "R&B": "rnb hits",
    "Dance": "dance hits",
    "Jazz": "jazz classics",
    "Instrumental": "instrumental focus music",
}
_FEATURED_GENRES = [{"id": name, "name": name} for name in _GENRE_QUERIES]

# Genres exposed when running purely on mock data.
_MOCK_GENRES = [{"id": name, "name": name}
                for name in ["Indie Folk", "Ambient", "Math Rock", "Bollywood", "Instrumental"]]

# id -> Track, populated lazily as genres are fetched (for /why-line lookups etc.)
# Mock tracks are mood-categorized up front so lookups always carry both axes.
_seen: Dict[str, Track] = {t.id: t for t in mood_mod.annotate_moods(TRACK_LIBRARY)}


def _remember(tracks: List[Track]) -> List[Track]:
    """Clean + categorize a pool, then register it for later id lookups."""
    cleaned = clean_tracks(tracks)
    for t in cleaned:
        _seen[t.id] = t
    return cleaned


def list_genres() -> List[Dict]:
    """Only the curated, useful genres — no raw (localized) Deezer genre dump."""
    if _SOURCE == "mock":
        return _MOCK_GENRES
    return _FEATURED_GENRES


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

    def _tag(tracks: List[Track]) -> List[Track]:
        # Strict tag match: the chosen mood is the intent, so every shown card
        # carries exactly that mood (and its genre) — no mismatched badges.
        for t in tracks:
            t.mood = mood
        return tracks

    if _SOURCE != "mock":
        try:
            # 1. A genre+mood editorial playlist ("Chill Bollywood") is the best fit
            #    — but only if enough of its tracks are actually playable.
            curated = dz.tracks_for_genre_mood(
                genre, mood_mod.keywords_for(mood), mood, limit=limit)
            if curated and _playable_count(curated) >= 3:
                return _tag(_remember(_prefer_playable(curated)))
        except dz.DeezerUnavailable:
            pass  # fall through to descriptor filtering below

    # 2. No genre+mood playlist: take the exact-genre pool and descriptor-filter
    #    it to the mood target. Works for both real and mock sources.
    pool = tracks_for_genre(genre, limit=max(limit * 3, 60))
    return _tag(mood_mod.filter_by_mood(pool, mood, limit))


def get_track_by_id(track_id: str) -> Optional[Track]:
    return _seen.get(track_id)


def any_track() -> Optional[Track]:
    return next(iter(_seen.values()), None)
