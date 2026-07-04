"""LLM reasoning: why-line generation + genre-adjacency judgment.

Every path degrades to a deterministic fallback (edge cases 2.1-2.10).
"""
from __future__ import annotations

import random
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

def generate_why(track: Track, persona: ListenerPersona, use_fallback: bool = False) -> str:
    if use_fallback or not has_api_key():
        return generate_why_fallback(track, persona)
    try:
        prompt = _why_prompt(track, persona)
        text = (call_llm(prompt) or "").strip()
        if not text or _leaks(text):  # edge cases 2.3, 2.5
            return generate_why_fallback(track, persona)
        return _trim_words(text, 30)  # edge case 2.4
    except Exception:  # edge case 2.2 (timeout/error/not-implemented)
        return generate_why_fallback(track, persona)


def generate_why_fallback(track: Track, persona: ListenerPersona) -> str:
    artist = persona.top_artists[0] if persona.top_artists else f"your {persona.top_genre} favorites"
    genre = track.genre_tags[0] if track.genre_tags else persona.top_genre
    valence = track.sound_descriptors.get("valence", 0.5)
    mood = "brighter" if valence >= 0.5 else "moodier"
    templates = [
        f"{track.title} digs into {genre} deeper than {artist}, with a {mood} pull you already gravitate toward.",
        f"If {artist} is your anchor, {track.artist} carries the same {genre} grain at a {mood} tilt.",
    ]
    return random.choice(templates)


def _why_prompt(track: Track, persona: ListenerPersona) -> str:
    sd = track.sound_descriptors
    return (
        f"You are a music discovery expert for {persona.name}, a {persona.top_genre} listener.\n"
        f"Top artists: {', '.join(persona.top_artists)}.\n"
        f"Track: {track.title} by {track.artist}; genres {', '.join(track.genre_tags)}; "
        f"energy={sd.get('energy')}, valence={sd.get('valence')}, tempo={sd.get('tempo')} BPM.\n"
        "Write ONE sentence (15-25 words) on why it fits their taste. Be specific about "
        "genre/mood/artist lineage. Never say 'algorithm' or 'recommendation'.\nSentence:"
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
