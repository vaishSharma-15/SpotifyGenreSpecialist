"""Deterministic recommendation pipeline.

Zero UI/LLM dependencies (testable in isolation). Edge-case references map to
docs/EdgeCases.md section numbers.
"""
from __future__ import annotations

import math
from typing import List, Set

from ..data.models import ListenerPersona, Track


# --- helpers ---------------------------------------------------------------

def _canon(genre: str) -> str:
    """Normalize genre for matching (edge case 2.11)."""
    return genre.strip().casefold()


def normalize_tempo(tempo: float) -> float:
    """Map BPM (~80-180) to [0,1], clamped (edge cases 1.10)."""
    lo, hi = 80.0, 180.0
    return max(0.0, min(1.0, (tempo - lo) / (hi - lo)))


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Cosine similarity guarded against zero-magnitude vectors (edge case 1.9)."""
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


# --- pipeline stages -------------------------------------------------------

def apply_genre_lock(all_tracks: List[Track], locked_genre: str) -> List[Track]:
    target = _canon(locked_genre)
    return [t for t in all_tracks if any(_canon(g) == target for g in t.genre_tags)]


def apply_popularity_ceiling(tracks: List[Track], dial_position: float) -> List[Track]:
    # Clamp dial (edge case 1.5). 0.0 -> floor 60, 1.0 -> floor 10.
    dial = max(0.0, min(1.0, dial_position))
    floor = 60.0 - dial * 50.0
    return [t for t in tracks if t.popularity_score >= floor]


def apply_novelty_filter(tracks: List[Track], excluded_ids: Set[str]) -> List[Track]:
    # Set-difference is safe against unknown IDs (edge case 5.3).
    return [t for t in tracks if t.id not in excluded_ids]


def taste_fit_score(track: Track, persona: ListenerPersona) -> float:
    sd = track.sound_descriptors
    pv = persona.preference_vector
    # Defaults for missing keys (edge cases 1.8, 5.4).
    track_vec = [
        sd.get("energy", 0.5),
        sd.get("valence", 0.5),
        normalize_tempo(sd.get("tempo", 120)),
    ]
    persona_vec = [
        pv.get("energy_preference", 0.5),
        pv.get("valence_preference", 0.5),
        normalize_tempo(pv.get("tempo_preference", 120)),
    ]
    return cosine_similarity(track_vec, persona_vec)


def rank_by_taste_fit(tracks: List[Track], persona: ListenerPersona) -> List[Track]:
    # Ties broken by recency (newer first) for determinism (edge case 1.7).
    return sorted(
        tracks,
        key=lambda t: (taste_fit_score(t, persona), t.release_year, t.id),
        reverse=True,
    )


def get_recommendations(
    persona: ListenerPersona,
    locked_genre: str,
    dial_position: float,
    excluded_ids: Set[str],
    limit: int = 5,
    candidate_tracks: List[Track] | None = None,
) -> List[Track]:
    """Rank recommendations from a candidate pool.

    `candidate_tracks` lets callers inject a real (e.g. Deezer) genre pool; when
    omitted we read the local mock library. Genre lock is still applied as a
    safety net even when the pool is pre-filtered.
    """
    if candidate_tracks is None:
        from ..data.mock_library import TRACK_LIBRARY
        candidate_tracks = TRACK_LIBRARY

    if limit <= 0:  # edge case 3.4
        return []

    pool = apply_genre_lock(candidate_tracks, locked_genre)
    pool = apply_popularity_ceiling(pool, dial_position)
    pool = apply_novelty_filter(pool, excluded_ids)
    ranked = rank_by_taste_fit(pool, persona)
    return ranked[:limit]  # may be shorter than limit (edge cases 1.1, 1.2)
