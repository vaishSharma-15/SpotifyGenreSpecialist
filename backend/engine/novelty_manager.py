"""Per-persona, per-session excluded-track state (edge cases 1.6, 4.7)."""
from __future__ import annotations

from typing import Dict, Set


class NoveltyManager:
    def __init__(self) -> None:
        self.excluded: Dict[str, Set[str]] = {}

    def mark_skip(self, persona_id: str, track_id: str) -> None:
        self.excluded.setdefault(persona_id, set()).add(track_id)

    def mark_save(self, persona_id: str, track_id: str) -> None:
        # Saved tracks don't resurface within the same session.
        self.excluded.setdefault(persona_id, set()).add(track_id)

    def get_excluded(self, persona_id: str) -> Set[str]:
        return set(self.excluded.get(persona_id, set()))

    def reset(self, persona_id: str) -> None:
        self.excluded.pop(persona_id, None)
