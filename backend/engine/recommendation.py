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


def rank_by_mood(tracks: List[Track], mood: str) -> List[Track]:
    """Order by closeness to the selected mood (best first), popularity as tiebreak."""
    from ..data import mood as mood_mod
    return sorted(
        tracks,
        key=lambda t: (mood_mod.mood_score(t, mood), t.popularity_score, t.release_year),
        reverse=True,
    )


def rank_by_popularity(tracks: List[Track], dial_position: float = 0.0) -> List[Track]:
    """Persona-independent default ordering when no mood is selected.

    The popularity *ceiling* (ranked by which tracks even qualify) already reacts
    to the dial, but chart-style pools often have far more than `limit` tracks
    above the floor at every dial position — so a plain popularity sort returns
    the same top-N regardless of dial. Blend in the dial here too: Safe (0) keeps
    mainstream-first order; Bold (1) flips to deep-cuts-first; Balanced (0.5)
    is popularity-neutral (ties broken deterministically), landing in between.
    """
    dial = max(0.0, min(1.0, dial_position))
    weight = 1.0 - 2 * dial  # +1 at Safe, 0 at Balanced, -1 at Bold
    return sorted(
        tracks,
        key=lambda t: (t.popularity_score * weight, t.release_year, t.id),
        reverse=True,
    )


def get_recommendations(
    persona: ListenerPersona,
    locked_genre: str,
    dial_position: float,
    excluded_ids: Set[str],
    limit: int = 5,
    candidate_tracks: List[Track] | None = None,
    mood: str = "",
) -> List[Track]:
    """Rank recommendations from a candidate pool.

    Ranking is driven by the selected `mood` (closest-fit first); with no mood we
    fall back to popularity. `candidate_tracks` lets callers inject a real (e.g.
    Deezer) genre pool; when omitted we read the local mock library. Genre lock is
    still applied as a safety net even when the pool is pre-filtered.
    """
    from ..data import mood as mood_mod

    if candidate_tracks is None:
        from ..data.mock_library import TRACK_LIBRARY
        candidate_tracks = TRACK_LIBRARY

    if limit <= 0:  # edge case 3.4
        return []

    genre_pool = apply_genre_lock(candidate_tracks, locked_genre)

    # Progressively relax filters instead of ever going empty: a small/expired
    # candidate pool (dial floor + already-served exclusions) shouldn't make
    # discovery "run out". Only a genre with zero tracks at all comes back empty.
    pool = apply_novelty_filter(apply_popularity_ceiling(genre_pool, dial_position), excluded_ids)
    if not pool:
        pool = apply_popularity_ceiling(genre_pool, dial_position)  # recycle served tracks
    if not pool:
        pool = apply_novelty_filter(genre_pool, excluded_ids)  # drop the popularity floor
    if not pool:
        pool = genre_pool  # last resort: everything in-genre, served or not

    if mood and mood_mod.is_mood(mood):
        ranked = rank_by_mood(pool, mood)
    else:
        ranked = rank_by_popularity(pool, dial_position)
    return ranked[:limit]  # may be shorter than limit (edge cases 1.1, 1.2)
