"""Thread-safe append-only feedback log (edge cases 3.6, 5.2)."""
from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from typing import Dict, List

_LOCK = threading.Lock()
_PATH = os.getenv("FEEDBACK_LOG", os.path.join(os.path.dirname(__file__), "feedback_log.json"))
VALID_ACTIONS = {"SAVE", "SKIP", "REPLAY"}


def _read() -> List[Dict]:
    if not os.path.exists(_PATH):
        return []
    try:
        with open(_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):  # corrupt/missing -> recover (5.2)
        return []


def save_feedback(persona_id: str, track_id: str, action: str) -> Dict:
    if action not in VALID_ACTIONS:  # edge case 3.3
        raise ValueError(f"Invalid action: {action!r}")
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "persona_id": persona_id,
        "track_id": track_id,
        "action": action,
    }
    with _LOCK:  # serialize concurrent writes (3.6)
        log = _read()
        log.append(entry)
        with open(_PATH, "w", encoding="utf-8") as f:
            json.dump(log, f, indent=2)
    return entry


def get_feedback(persona_id: str | None = None) -> List[Dict]:
    log = _read()
    if persona_id is None:
        return log
    return [e for e in log if e.get("persona_id") == persona_id]
