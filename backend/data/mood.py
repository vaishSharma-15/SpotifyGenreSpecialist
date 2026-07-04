"""Mood layer for data ingestion (deterministic, no network).

A *mood* is a target point in sound-descriptor space (energy, valence). Given a
pool of tracks — each carrying energy/valence descriptors (real bpm-derived from
Deezer, or hand-authored in the mock library) — we score every track by how close
it sits to the mood target and keep the closest.

This keeps mood filtering usable even with zero network access (mock mode) and
mirrors the genre-lock/taste-fit philosophy: deterministic, testable, explainable.

Deezer also exposes editorial mood playlists; `deezer_provider` uses these
`keywords` to fetch genuinely mood-curated songs when the network is available,
then this module ranks/filters as the resilient fallback.
"""
from __future__ import annotations

from typing import Dict, List

from .models import Track

# name -> target descriptors (0-1) + Deezer playlist search keywords.
MOOD_PROFILES: Dict[str, Dict] = {
    "Chill":       {"energy": 0.25, "valence": 0.55, "keywords": ["chill", "relax"]},
    "Energetic":   {"energy": 0.90, "valence": 0.70, "keywords": ["energy", "workout"]},
    "Happy":       {"energy": 0.65, "valence": 0.90, "keywords": ["happy", "feel good"]},
    "Melancholic": {"energy": 0.30, "valence": 0.15, "keywords": ["sad", "melancholy"]},
    "Focus":       {"energy": 0.40, "valence": 0.50, "keywords": ["focus", "concentration"]},
    "Romantic":    {"energy": 0.45, "valence": 0.80, "keywords": ["love", "romantic"]},
}


def list_moods() -> List[Dict]:
    """[{id, name}] of available moods (id == name for a stable, human-readable key)."""
    return [{"id": name, "name": name} for name in MOOD_PROFILES]


def _profile(mood: str) -> Dict:
    for name, prof in MOOD_PROFILES.items():
        if name.casefold() == mood.strip().casefold():
            return prof
    raise KeyError(mood)


def is_mood(mood: str) -> bool:
    try:
        _profile(mood)
        return True
    except KeyError:
        return False


def keywords_for(mood: str) -> List[str]:
    return _profile(mood)["keywords"]


def mood_score(track: Track, mood: str) -> float:
    """Closeness of a track to a mood target, in [0, 1] (1 == exact match).

    Euclidean distance in (energy, valence) space, normalized by the max possible
    distance (sqrt(2)) and inverted so higher == better.
    """
    prof = _profile(mood)
    sd = track.sound_descriptors
    de = sd.get("energy", 0.5) - prof["energy"]
    dv = sd.get("valence", 0.5) - prof["valence"]
    dist = (de * de + dv * dv) ** 0.5
    return round(max(0.0, 1.0 - dist / (2 ** 0.5)), 4)


def filter_by_mood(tracks: List[Track], mood: str, limit: int = 100,
                   min_score: float = 0.6) -> List[Track]:
    """Keep tracks matching the mood, closest first.

    `min_score` drops tracks that are too far from the mood target; if that would
    empty the pool we relax it and simply return the closest `limit` (never dead).
    """
    if not is_mood(mood):
        return tracks[:limit]
    scored = sorted(tracks, key=lambda t: mood_score(t, mood), reverse=True)
    kept = [t for t in scored if mood_score(t, mood) >= min_score]
    if not kept:
        kept = scored  # relax rather than return nothing
    return kept[:limit]
