"""Real music data via the public Deezer API (no key / OAuth required).

Why Deezer: free, unauthenticated, exposes a genre list, per-genre chart tracks,
30s previews and album art — the cleanest fit for "pick a genre -> real songs".

Deezer does NOT expose Spotify-style audio-features (energy/valence). We derive a
stable heuristic vector so the deterministic taste-fit ranking keeps working:
  - popularity_score : track `rank`, min-max normalized within the fetched batch
  - tempo            : track `bpm` when present, else a deterministic pseudo-BPM
  - energy           : normalized tempo (faster -> more energetic)
  - valence          : deterministic hash of the title (stable across calls)

Resilience (docs/EdgeCases.md §2.2 style): any network failure falls back to the
local mock library so the app is always functional.
"""
from __future__ import annotations

import hashlib
import json
import time
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple

from .models import Track

_BASE = "https://api.deezer.com"
_TIMEOUT = 4.0
_CACHE_TTL = 300  # seconds
_cache: Dict[str, Tuple[float, object]] = {}


class DeezerUnavailable(RuntimeError):
    pass


def _get(path: str) -> dict:
    now = time.time()
    hit = _cache.get(path)
    if hit and now - hit[0] < _CACHE_TTL:
        return hit[1]  # type: ignore[return-value]
    url = f"{_BASE}{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DiscoveryDJ/1.0"})
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:  # network/timeout/parse
        raise DeezerUnavailable(str(e)) from e
    if isinstance(data, dict) and data.get("error"):
        raise DeezerUnavailable(str(data["error"]))
    _cache[path] = (now, data)
    return data


# --- derived descriptors ---------------------------------------------------

def _stable_unit(seed: str) -> float:
    h = hashlib.md5(seed.encode("utf-8")).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def _pseudo_bpm(seed: str) -> float:
    return 90.0 + _stable_unit(seed + "bpm") * 70.0  # 90-160


def _to_track(raw: dict, genre_name: str, rank_lo: int, rank_hi: int) -> Track:
    rank = raw.get("rank", 0) or 0
    span = max(1, rank_hi - rank_lo)
    popularity = round(max(0.0, min(100.0, (rank - rank_lo) / span * 100.0)), 1)
    bpm = raw.get("bpm") or _pseudo_bpm(str(raw.get("id")))
    energy = max(0.0, min(1.0, (bpm - 80.0) / 100.0))
    valence = _stable_unit(raw.get("title", "") + str(raw.get("id")))
    album = raw.get("album") or {}
    artist = raw.get("artist") or {}
    return Track(
        id=f"dz{raw.get('id')}",
        title=raw.get("title", "Unknown"),
        artist=artist.get("name", "Unknown"),
        album_art_url=album.get("cover_medium") or album.get("cover") or "",
        genre_tags=[genre_name],
        popularity_score=popularity,
        sound_descriptors={"energy": round(energy, 3),
                           "valence": round(valence, 3),
                           "tempo": round(bpm, 1)},
        release_year=int((raw.get("album", {}).get("release_date") or "0000")[:4] or 0),
    )


# --- public API ------------------------------------------------------------

def list_genres() -> List[Dict]:
    """Return [{id, name}] of real Deezer genres (excludes the 'All' pseudo-genre)."""
    data = _get("/genre")
    return [{"id": g["id"], "name": g["name"]}
            for g in data.get("data", []) if g.get("id")]


def _genre_id_for(genre: str) -> Optional[int]:
    if genre.isdigit():
        return int(genre)
    target = genre.strip().casefold()
    for g in list_genres():
        if g["name"].casefold() == target:
            return g["id"]
    return None


def _tracks_from_raw(raw: List[dict], genre_name: str,
                     extra_tag: Optional[str] = None) -> List[Track]:
    if not raw:
        return []
    ranks = [t.get("rank", 0) or 0 for t in raw]
    lo, hi = min(ranks), max(ranks)
    tracks = [_to_track(t, genre_name, lo, hi) for t in raw]
    if extra_tag:
        for t in tracks:
            if extra_tag not in t.genre_tags:
                t.genre_tags.append(extra_tag)
    return tracks


def _search_tracks(name: str, limit: int) -> List[dict]:
    q = urllib.parse.quote(name)
    return _get(f"/search?q={q}&limit={limit}").get("data", [])


def tracks_for_genre(genre: str, limit: int = 100) -> List[Track]:
    """Real tracks for a genre (by name or numeric id). Raises DeezerUnavailable.

    If the label isn't a Deezer chart genre (e.g. "Bollywood", "Punjabi", "Tamil"),
    we fall back to a keyword search so any user-facing label still returns songs.
    """
    gid = _genre_id_for(genre)
    if gid is None:
        # Not a Deezer chart genre -> treat the label as a search query.
        return _tracks_from_raw(_search_tracks(genre, limit), genre)
    name = next((g["name"] for g in list_genres() if g["id"] == gid), genre)
    raw = _get(f"/chart/{gid}/tracks?limit={limit}").get("data", [])
    if not raw:
        # Fallback path: search by genre name for broader coverage.
        raw = _search_tracks(name, limit)
    return _tracks_from_raw(raw, name)


def tracks_for_genre_mood(genre: str, mood_keywords: List[str], mood_name: str,
                          limit: int = 100) -> List[Track]:
    """Real, mood-curated tracks: find a Deezer editorial mood playlist for the
    genre, then return its tracks. Falls back to [] so callers can descriptor-filter.

    Strategy: search playlists for "<mood keyword> <genre>", take the largest
    matching playlist and pull its tracks. Deezer's editorial playlists ("Chill
    Rock", "Happy Hits", ...) are genuinely mood-curated, unlike raw charts.
    """
    gid = _genre_id_for(genre)
    name = next((g["name"] for g in list_genres() if g["id"] == gid), genre) if gid else genre
    for kw in mood_keywords:
        q = urllib.parse.quote(f"{kw} {name}")
        playlists = _get(f"/search/playlist?q={q}&limit=5").get("data", [])
        # Prefer the playlist with the most tracks (richer pool).
        playlists = sorted(playlists, key=lambda p: p.get("nb_tracks", 0), reverse=True)
        for pl in playlists:
            pid = pl.get("id")
            if not pid:
                continue
            raw = _get(f"/playlist/{pid}/tracks?limit={limit}").get("data", [])
            tracks = _tracks_from_raw(raw, name, extra_tag=mood_name)
            if tracks:
                return tracks
    return []
