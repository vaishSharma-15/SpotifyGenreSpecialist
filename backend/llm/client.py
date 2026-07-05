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

def generate_why(track: Track, persona: ListenerPersona, genre: str = "", mood: str = "",
                 top_artist: str = "", signal_type: str = "", signal_track: str = "",
                 signal_artist: str = "", use_fallback: bool = False) -> str:
    """Explain why THIS track fits the listener's chosen genre/mood and a real
    listening signal (their top artist in-genre, or a recent save/skip).

    Grounded in specifics, never generic praise — see `_why_prompt`.
    """
    args = (track, persona, genre, mood, top_artist, signal_type, signal_track, signal_artist)
    if use_fallback or not has_api_key():
        return generate_why_fallback(*args)
    try:
        prompt = _why_prompt(track, persona, genre, mood, top_artist, signal_type, signal_track, signal_artist)
        text = (call_llm(prompt) or "").strip().strip('"')
        if not text or _leaks(text):  # edge cases 2.3, 2.5
            return generate_why_fallback(*args)
        return _trim_words(text, 22)  # edge case 2.4
    except Exception:  # edge case 2.2 (timeout/error/not-implemented)
        return generate_why_fallback(*args)


def _energy_word(e: float) -> str:
    return "high-energy" if e >= 0.66 else "laid-back" if e <= 0.33 else "steady"


def _valence_word(v: float) -> str:
    return "upbeat" if v >= 0.66 else "melancholic" if v <= 0.33 else "wistful"


def _persona_fit_phrase(track: Track, persona: ListenerPersona) -> str:
    """How this track's sound compares to the listener's own historical taste —
    the personal touch a bare genre/mood/popularity description is missing."""
    sd = track.sound_descriptors
    pv = persona.preference_vector
    e_diff = sd.get("energy", 0.5) - pv.get("energy_preference", 0.5)
    v_diff = sd.get("valence", 0.5) - pv.get("valence_preference", 0.5)
    if abs(e_diff) < 0.15 and abs(v_diff) < 0.15:
        return "right in your usual wheelhouse"
    if e_diff >= 0.15:
        return "punchier than what you usually reach for"
    if e_diff <= -0.15:
        return "calmer than your usual go-to"
    if v_diff >= 0.15:
        return "brighter than your typical pick"
    return "moodier than your typical pick"


def _pick(track: Track, options: list) -> str:
    """Deterministic pick by track id so the same track is stable, different tracks differ."""
    return options[sum(ord(c) for c in track.id) % len(options)]


def generate_why_fallback(track: Track, persona: ListenerPersona, genre: str = "", mood: str = "",
                          top_artist: str = "", signal_type: str = "", signal_track: str = "",
                          signal_artist: str = "") -> str:
    """Deterministic, per-track template (no API key).

    Never just restates the genre/mood as a description — leads with something
    the listener couldn't have guessed from their own inputs: a contrast with
    what they just skipped, an echo of what they just saved, a comparison to
    their top artist in the genre, or how mainstream/deep-cut this pick is.
    Falls back through that same priority order the LLM prompt uses.
    """
    genre = genre or (track.genre_tags[0] if track.genre_tags else persona.top_genre)
    sd = track.sound_descriptors
    energy = _energy_word(sd.get("energy", 0.5))
    valence = _valence_word(sd.get("valence", 0.5))
    mood_ctx = mood or track.mood or valence
    pop = track.popularity_score

    if signal_type == "SKIP" and signal_track:
        return _pick(track, [
            f"You skipped \"{signal_track}\" — {track.artist}'s {energy} take on {genre} "
            f"pulls back from that {signal_artist} energy for a {mood_ctx} mood instead.",
            f"Less like \"{signal_track}\": {track.title} keeps the {genre} lane but trades its "
            f"vibe for something more {valence} and {mood_ctx}.",
        ])
    if signal_type == "SAVE" and signal_track:
        return _pick(track, [
            f"Since \"{signal_track}\" landed, {track.artist} scratches that same {genre} itch "
            f"from a {energy}, {mood_ctx} angle {signal_artist} doesn't cover.",
            f"{track.title} follows the thread from \"{signal_track}\" into a {valence} corner of "
            f"{genre} you haven't tapped yet.",
        ])
    if top_artist and top_artist.strip().casefold() != track.artist.strip().casefold():
        return _pick(track, [
            f"Past {top_artist} in your {genre} rotation, {track.artist} works the same {mood_ctx} "
            f"lane with a {energy} edge {top_artist} rarely touches.",
            f"{track.artist} isn't {top_artist}, but shares the {genre} DNA — just {valence} enough "
            f"to fit a {mood_ctx} mood without repeating what you already know.",
        ])
    fit = _persona_fit_phrase(track, persona)
    if pop < 35:
        return _pick(track, [
            f"A deep {genre} cut most playlists skip — {track.artist}'s {track.title} is {fit}, "
            f"earning its {mood_ctx} spot on sound alone.",
            f"Under-the-radar in {genre}: {track.artist} trades chart presence for something "
            f"{fit}, worth the {mood_ctx} discovery.",
        ])
    if pop > 70:
        return _pick(track, [
            f"A bigger {genre} name than usual here — {track.artist} earns the {mood_ctx} slot "
            f"by being {fit}, not just familiar.",
            f"{track.title} is a proven {genre} favorite, but it's picked for this {mood_ctx} "
            f"moment because it's {fit}.",
        ])
    return _pick(track, [
        f"{track.artist} sits in the middle of the {genre} pack — {fit}, which earns the "
        f"{mood_ctx} slot more than the name does.",
        f"Neither a deep cut nor a chart-topper, {track.title} is {fit} — the real reason it "
        f"fits your {mood_ctx} pick.",
    ])


def _why_prompt(track: Track, persona: ListenerPersona, genre: str, mood: str, top_artist: str,
                signal_type: str, signal_track: str, signal_artist: str) -> str:
    genre = genre or (track.genre_tags[0] if track.genre_tags else "this genre")
    mood_text = mood or "no particular mood"
    top_artist_text = top_artist or "none yet"
    signal_line = (
        f'- Recent signal: {signal_type} "{signal_track}" ({signal_artist})'
        if signal_type and signal_track
        else "- Recent signal: none yet"
    )
    popularity = int(round(track.popularity_score))
    fit = _persona_fit_phrase(track, persona)
    return (
        "You are writing a one-sentence explanation for why a song was\n"
        "recommended to a Spotify listener. Ground it in specifics — genre,\n"
        "mood, or a real listening signal — never generic praise.\n"
        "\n"
        "Listener's inputs:\n"
        f"- Genre selected: {genre}\n"
        f"- Mood selected: {mood_text}\n"
        f"- Top artist in this genre: {top_artist_text}\n"
        f"{signal_line}\n"
        f"- How this track compares to their usual taste: {fit}\n"
        "\n"
        "Candidate track:\n"
        f"- Title: {track.title}\n"
        f"- Artist: {track.artist}\n"
        f"- Popularity: {popularity}/100\n"
        "\n"
        "Write ONE sentence, max 22 words, explaining why this track was picked.\n"
        "Reference the genre/mood AND the specific listening signal (top artist\n"
        "or recent like/skip) — don't just describe the track. Never open with\n"
        "\"You'll love\" or similar praise phrases. If the recent signal is a skip,\n"
        "explain how this pick differs from what was skipped, not why it's similar.\n"
        "\n"
        "Don't simply restate the genre and mood as a description of the track\n"
        "(e.g. \"a mid-tier Bollywood pick fitting the chill mood with moderate\n"
        "popularity\" — this is exactly the generic, impersonal phrasing to avoid).\n"
        "Add something the listener couldn't have guessed from their own inputs —\n"
        "a specific artist connection, a comparison to a past like/skip, or how\n"
        "this compares to their usual taste (given above) — it must sound like it\n"
        "was written FOR this listener, not a spec sheet of the track's stats.\n"
        "If there's no top artist or recent signal, lean on the taste comparison\n"
        "and popularity together (deep cut / proven favorite / middle-of-the-pack)\n"
        "to explain why THIS listener, specifically, should hear it.\n"
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
