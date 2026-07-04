"""LLM reasoning: why-line generation + genre-adjacency judgment.

Every path degrades to a deterministic fallback (edge cases 2.1-2.10).
"""
from __future__ import annotations

from typing import Tuple

from ..data.models import ListenerPersona, Track
from .config import call_llm, has_api_key

FORBIDDEN = ("our algorithm", "recommendation", "recommendations")

ADJACENCY_MAP = {
    "indie folk": ["chamber folk", "alt-country", "singer-songwriter"],
    "ambient": ["drone", "post-rock", "minimalist classical"],
    "math rock": ["post-hardcore", "prog-rock", "experimental"],
}


# --- why-line --------------------------------------------------------------

def generate_why(track: Track, persona: ListenerPersona,
                 mood: str = "", use_fallback: bool = False) -> str:
    """Explain why THIS track fits the listener's chosen genre and mood.

    Centered on the track's own genre/mood/sonic profile — not the persona's
    reference artists — so a Bollywood pick isn't explained via folk artists.
    """
    if use_fallback or not has_api_key():
        return generate_why_fallback(track, persona, mood)
    try:
        prompt = _why_prompt(track, mood)
        text = (call_llm(prompt) or "").strip().strip('"')
        if not text or _leaks(text):  # edge cases 2.3, 2.5
            return generate_why_fallback(track, persona, mood)
        return _trim_words(text, 32)  # edge case 2.4
    except Exception:  # edge case 2.2 (timeout/error/not-implemented)
        return generate_why_fallback(track, persona, mood)


def _energy_word(e: float) -> str:
    return "high-energy" if e >= 0.66 else "laid-back" if e <= 0.33 else "steady"


def _valence_word(v: float) -> str:
    return "upbeat" if v >= 0.66 else "melancholic" if v <= 0.33 else "wistful"


def generate_why_fallback(track: Track, persona: ListenerPersona, mood: str = "") -> str:
    """Deterministic, per-track template (no API key). Varies by track so no two
    cards read identically, and describes the song's own genre/mood/sonics."""
    genre = track.genre_tags[0] if track.genre_tags else persona.top_genre
    sd = track.sound_descriptors
    energy = _energy_word(sd.get("energy", 0.5))
    valence = _valence_word(sd.get("valence", 0.5))
    tempo = int(sd.get("tempo", 120))
    mood_ctx = mood or track.mood or valence
    templates = [
        f"A {energy}, {valence} {genre} cut — {track.artist}'s {track.title} lands squarely in a {mood_ctx} mood.",
        f"{track.title} carries {track.artist}'s {genre} signature with a {valence}, {tempo}-BPM pulse fit for {mood_ctx} listening.",
        f"For a {mood_ctx} moment in {genre}, {track.title} brings {track.artist}'s {energy} phrasing and {valence} tone.",
        f"{track.artist} keeps it {energy} and {valence} here — a {genre} pick made for {mood_ctx} vibes.",
    ]
    # Deterministic pick by track id so the same track is stable, different tracks differ.
    idx = sum(ord(c) for c in track.id) % len(templates)
    return templates[idx]


def _why_prompt(track: Track, mood: str) -> str:
    sd = track.sound_descriptors
    genre = track.genre_tags[0] if track.genre_tags else "this genre"
    mood_line = f"The listener is in a '{mood}' mood.\n" if mood else ""
    return (
        f"You are a music expert helping someone explore {genre} music.\n"
        f"{mood_line}"
        f"Track: '{track.title}' by {track.artist}. Genre: {', '.join(track.genre_tags)}. "
        f"Feel: energy={sd.get('energy')}, valence={sd.get('valence')} (happiness), "
        f"tempo={sd.get('tempo')} BPM.\n"
        f"Write ONE sentence (15-25 words) on why THIS specific song fits {genre}"
        f"{' and a ' + mood + ' mood' if mood else ''}. "
        "Reference its actual sound (energy/mood/tempo) and artist — be specific to this track, "
        "not generic. Do not mention other genres' artists, 'algorithm', or 'recommendation'.\n"
        "Sentence:"
    )


# --- genre adjacency -------------------------------------------------------

def judge_genre_adjacency(candidate_genre: str, user_genre: str, use_fallback: bool = False) -> Tuple[bool, str]:
    # Self-adjacency short-circuit (edge case 2.10).
    if candidate_genre.strip().casefold() == user_genre.strip().casefold():
        return True, f"{candidate_genre} is the listener's own genre."
    if use_fallback or not has_api_key():
        return judge_genre_adjacency_fallback(candidate_genre, user_genre)
    try:
        prompt = (
            f"Are {candidate_genre!r} and {user_genre!r} close enough in sound and lineage "
            f"that a deep cut in {candidate_genre} would appeal to a {user_genre} fan?\n"
            "Reply with line 1 = YES or NO, line 2 = one-sentence reason."
        )
        resp = (call_llm(prompt) or "").strip()
        lines = [ln for ln in resp.splitlines() if ln.strip()]
        if not lines:  # edge case 2.6
            return judge_genre_adjacency_fallback(candidate_genre, user_genre)
        is_adjacent = "YES" in lines[0].upper()
        reasoning = lines[1] if len(lines) > 1 else ""
        return is_adjacent, reasoning
    except Exception:  # edge case 2.2
        return judge_genre_adjacency_fallback(candidate_genre, user_genre)


def judge_genre_adjacency_fallback(candidate_genre: str, user_genre: str) -> Tuple[bool, str]:
    neighbors = ADJACENCY_MAP.get(user_genre.strip().casefold(), [])  # edge case 2.9
    is_adjacent = candidate_genre.strip().casefold() in neighbors
    reasoning = (
        f"{candidate_genre} shares sonic roots with {user_genre}."
        if is_adjacent
        else f"{candidate_genre} diverges too far from {user_genre}."
    )
    return is_adjacent, reasoning


# --- utilities -------------------------------------------------------------

def _leaks(text: str) -> bool:
    low = text.casefold()
    return any(bad in low for bad in FORBIDDEN)


def _trim_words(text: str, max_words: int) -> str:
    words = text.split()
    return text if len(words) <= max_words else " ".join(words[:max_words]).rstrip(",;:") + "."
