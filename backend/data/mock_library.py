"""Hand-curated mock track library and listener personas.

Edge cases handled here:
- 1.11 / 5.1: unique-id + required-field validation at import (fail fast).
"""
from __future__ import annotations

from typing import Dict, List, Optional

from .models import ListenerPersona, Track


def _sd(energy: float, valence: float, tempo: float) -> Dict[str, float]:
    return {"energy": energy, "valence": valence, "tempo": tempo}


TRACK_LIBRARY: List[Track] = [
    # --- Indie Folk ---
    Track("t01", "White Winter Hymnal", "Fleet Foxes", "https://picsum.photos/seed/t01/300",
          ["Indie Folk"], 78, _sd(0.45, 0.60, 110), 2008),
    Track("t02", "1612", "Vulfpeck", "https://picsum.photos/seed/t02/300",
          ["Indie Folk", "Chamber Folk"], 42, _sd(0.55, 0.70, 105), 2015),
    Track("t03", "Buffy", "S. Carey", "https://picsum.photos/seed/t03/300",
          ["Indie Folk"], 18, _sd(0.35, 0.45, 92), 2018),
    Track("t04", "Holocene", "Bon Iver", "https://picsum.photos/seed/t04/300",
          ["Indie Folk"], 71, _sd(0.30, 0.40, 90), 2011),
    Track("t05", "Tennessee", "Big Red Machine", "https://picsum.photos/seed/t05/300",
          ["Indie Folk", "Alt-Country"], 33, _sd(0.40, 0.50, 100), 2021),
    Track("t06", "Naomi", "Neutral Milk Hotel", "https://picsum.photos/seed/t06/300",
          ["Indie Folk"], 55, _sd(0.60, 0.55, 120), 1998),
    # --- Ambient / Instrumental ---
    Track("t07", "Re:member", "Ólafur Arnalds", "https://picsum.photos/seed/t07/300",
          ["Ambient", "Instrumental", "Minimalist Classical"], 64, _sd(0.25, 0.35, 85), 2018),
    Track("t08", "All That I've Got", "Ben Frost", "https://picsum.photos/seed/t08/300",
          ["Ambient", "Drone"], 22, _sd(0.20, 0.20, 70), 2009),
    Track("t09", "Felt", "Nils Frahm", "https://picsum.photos/seed/t09/300",
          ["Ambient", "Instrumental"], 48, _sd(0.18, 0.30, 78), 2011),
    Track("t10", "Emerald Rush", "Jon Hopkins", "https://picsum.photos/seed/t10/300",
          ["Ambient", "Instrumental", "Post-Rock"], 59, _sd(0.55, 0.45, 122), 2018),
    Track("t11", "An Ending (Ascent)", "Brian Eno", "https://picsum.photos/seed/t11/300",
          ["Ambient", "Instrumental"], 68, _sd(0.15, 0.55, 60), 1983),
    Track("t12", "Kompakt", "Gas", "https://picsum.photos/seed/t12/300",
          ["Ambient", "Drone"], 12, _sd(0.30, 0.25, 100), 2000),
    # --- Math Rock ---
    Track("t13", "E-Mei", "TTNG", "https://picsum.photos/seed/t13/300",
          ["Math Rock"], 44, _sd(0.75, 0.65, 145), 2013),
    Track("t14", "A Lot of People Died", "Don Caballero", "https://picsum.photos/seed/t14/300",
          ["Math Rock", "Experimental"], 15, _sd(0.85, 0.50, 160), 1998),
    Track("t15", "Omwa Tey", "Adebisi Shank", "https://picsum.photos/seed/t15/300",
          ["Math Rock"], 28, _sd(0.90, 0.75, 155), 2010),
    Track("t16", "Rithm", "Toe", "https://picsum.photos/seed/t16/300",
          ["Math Rock", "Post-Rock"], 52, _sd(0.65, 0.60, 138), 2015),
    Track("t17", "Weightless", "Chon", "https://picsum.photos/seed/t17/300",
          ["Math Rock"], 61, _sd(0.70, 0.80, 142), 2015),
    Track("t18", "Sailor's Grave", "Covet", "https://picsum.photos/seed/t18/300",
          ["Math Rock", "Prog-Rock"], 39, _sd(0.68, 0.72, 150), 2018),
    # --- Bollywood / Indian (offline fallback for the Indian catalog) ---
    Track("t19", "Kesariya", "Arijit Singh", "https://picsum.photos/seed/t19/300",
          ["Bollywood", "Indian"], 82, _sd(0.50, 0.80, 98), 2022),
    Track("t20", "Kun Faya Kun", "A.R. Rahman", "https://picsum.photos/seed/t20/300",
          ["Bollywood", "Indian", "Sufi"], 70, _sd(0.35, 0.60, 92), 2011),
    Track("t21", "Channa Mereya", "Arijit Singh", "https://picsum.photos/seed/t21/300",
          ["Bollywood", "Indian"], 74, _sd(0.30, 0.25, 90), 2016),
    Track("t22", "Tum Hi Ho", "Arijit Singh", "https://picsum.photos/seed/t22/300",
          ["Bollywood", "Indian"], 80, _sd(0.28, 0.45, 85), 2013),
    Track("t23", "Nagada Sang Dhol", "Shreya Ghoshal", "https://picsum.photos/seed/t23/300",
          ["Bollywood", "Indian"], 66, _sd(0.88, 0.85, 140), 2013),
    Track("t24", "Ilahi", "Arijit Singh", "https://picsum.photos/seed/t24/300",
          ["Bollywood", "Indian"], 63, _sd(0.65, 0.82, 120), 2013),
    # --- Soothing Bollywood (calm, Studying-friendly) ---
    Track("t25", "Agar Tum Saath Ho", "Arijit Singh", "https://picsum.photos/seed/t25/300",
          ["Bollywood", "Indian"], 77, _sd(0.15, 0.35, 68), 2015),
    Track("t26", "Tum Se Hi", "Mohit Chauhan", "https://picsum.photos/seed/t26/300",
          ["Bollywood", "Indian"], 68, _sd(0.20, 0.45, 78), 2007),
    Track("t27", "Phir Le Aya Dil", "Rahat Fateh Ali Khan", "https://picsum.photos/seed/t27/300",
          ["Bollywood", "Indian", "Sufi"], 60, _sd(0.22, 0.40, 72), 2012),
    # --- Instrumental / calming (Studying, focus, rain) ---
    Track("t28", "Still Frames", "Paresh Pahuja", "https://picsum.photos/seed/t28/300",
          ["Instrumental", "Ambient"], 24, _sd(0.15, 0.50, 65), 2019),
    Track("t29", "Gentle Rainfall", "Rain Sounds", "https://picsum.photos/seed/t29/300",
          ["Instrumental", "Ambient"], 30, _sd(0.10, 0.45, 55), 2021),
    Track("t30", "Nuvole Bianche", "Ludovico Einaudi", "https://picsum.photos/seed/t30/300",
          ["Instrumental", "Ambient"], 72, _sd(0.20, 0.55, 70), 2004),
]


LISTENER_PERSONAS: List[ListenerPersona] = [
    ListenerPersona(
        id="p1", name="Deep Folk Lover", top_genre="Indie Folk",
        top_artists=["Fleet Foxes", "Bon Iver", "Big Red Machine"],
        recently_played=["t01", "t04"],
        preference_vector={"energy_preference": 0.40, "valence_preference": 0.55,
                           "tempo_preference": 100, "genre_openness": 0.6},
    ),
    ListenerPersona(
        id="p2", name="Ambient Explorer", top_genre="Ambient",
        top_artists=["Ólafur Arnalds", "Nils Frahm", "Jon Hopkins"],
        recently_played=["t07"],
        preference_vector={"energy_preference": 0.25, "valence_preference": 0.35,
                           "tempo_preference": 80, "genre_openness": 0.7},
    ),
    ListenerPersona(
        id="p3", name="Math Rock Head", top_genre="Math Rock",
        top_artists=["TTNG", "Chon", "Covet"],
        recently_played=["t17"],
        preference_vector={"energy_preference": 0.75, "valence_preference": 0.70,
                           "tempo_preference": 145, "genre_openness": 0.5},
    ),
]


# --- Fail-fast validation (edge cases 1.11, 5.1) ---
def _validate() -> None:
    seen = set()
    for t in TRACK_LIBRARY:
        assert t.id, "Track with empty id"
        assert t.id not in seen, f"Duplicate track id: {t.id}"
        assert t.genre_tags, f"Track {t.id} has no genre_tags"
        seen.add(t.id)
    pids = set()
    for p in LISTENER_PERSONAS:
        assert p.id and p.id not in pids, f"Bad/duplicate persona id: {p.id}"
        pids.add(p.id)


_validate()


# --- Lookup helpers ---
_TRACKS_BY_ID = {t.id: t for t in TRACK_LIBRARY}
_PERSONAS_BY_ID = {p.id: p for p in LISTENER_PERSONAS}


def get_track_by_id(track_id: str) -> Optional[Track]:
    return _TRACKS_BY_ID.get(track_id)


def get_persona_by_id(persona_id: str) -> Optional[ListenerPersona]:
    return _PERSONAS_BY_ID.get(persona_id)
