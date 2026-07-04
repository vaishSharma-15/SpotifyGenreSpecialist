"""Core data models for Discovery DJ (deterministic, no UI/LLM deps)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List


class Action(str, Enum):
    SAVE = "SAVE"
    SKIP = "SKIP"
    REPLAY = "REPLAY"


class Screen(str, Enum):
    HOME_SHELF = "HOME_SHELF"
    AUTOPLAY_MOMENT = "AUTOPLAY_MOMENT"


@dataclass
class Track:
    id: str
    title: str
    artist: str
    album_art_url: str
    genre_tags: List[str]
    popularity_score: float  # 0-100
    sound_descriptors: Dict[str, float]  # energy 0-1, valence 0-1, tempo BPM
    release_year: int = 2020
    mood: str = ""  # categorized mood (see data/mood.py classify_mood); "" until set
    preview_url: str = ""  # 30s audio preview (Deezer); "" when unavailable


@dataclass
class ListenerPersona:
    id: str
    name: str
    top_genre: str
    top_artists: List[str]
    recently_played: List[str]  # track IDs
    preference_vector: Dict[str, float]  # energy_preference, valence_preference, tempo_preference, genre_openness


@dataclass
class UserAction:
    timestamp: datetime
    persona_id: str
    track_id: str
    action: Action
    screen: Screen
    context: Dict = field(default_factory=dict)
