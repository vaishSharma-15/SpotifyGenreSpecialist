"""API-level edge-case tests (docs/EdgeCases.md §3). Requires fastapi + httpx."""
import os

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

os.environ["FEEDBACK_LOG"] = "/tmp/discovery_dj_test_feedback.json"
os.environ["DATA_SOURCE"] = "mock"  # deterministic, no network dependency
if os.path.exists(os.environ["FEEDBACK_LOG"]):
    os.remove(os.environ["FEEDBACK_LOG"])

from backend.api import app  # noqa: E402

client = TestClient(app)


def test_recommend_ok():
    r = client.get("/recommend", params={"persona_id": "p1", "locked_genre": "Indie Folk"})
    assert r.status_code == 200
    assert all("Indie Folk" in t["genre_tags"] for t in r.json()["tracks"])  # invariant 1


def test_unknown_persona_404():  # 3.1
    r = client.get("/recommend", params={"persona_id": "nope", "locked_genre": "Ambient"})
    assert r.status_code == 404


def test_dial_out_of_range_422():  # 3.4 (pydantic bound)
    r = client.get("/recommend", params={"persona_id": "p1", "locked_genre": "Ambient", "dial_position": 5})
    assert r.status_code == 422


def test_invalid_action_rejected():  # 3.3
    r = client.post("/feedback", json={"persona_id": "p1", "track_id": "t01", "action": "LOVE"})
    assert r.status_code == 400


def test_feedback_then_excluded():  # 1.6 across API
    client.post("/feedback", json={"persona_id": "p3", "track_id": "t17", "action": "SKIP"})
    r = client.get("/recommend", params={"persona_id": "p3", "locked_genre": "Math Rock", "dial_position": 1})
    assert "t17" not in {t["id"] for t in r.json()["tracks"]}


def test_why_unknown_track_400():  # 3.2
    r = client.post("/why-line", params={"track_id": "zzz", "persona_id": "p1"})
    assert r.status_code == 400


def test_baseline_ok():
    r = client.get("/baseline", params={"persona_id": "p1", "locked_genre": "Indie Folk"})
    assert r.status_code == 200 and "track" in r.json()


def test_genres_listed():
    r = client.get("/genres")
    assert r.status_code == 200 and len(r.json()["genres"]) >= 1


def test_endless_discovery_no_repeat():  # after-finish auto-fetch
    p = {"persona_id": "p1", "locked_genre": "Indie Folk", "dial_position": 1, "limit": 2}
    first = client.get("/recommend", params=p).json()["tracks"]
    served = ",".join(t["id"] for t in first)
    nxt = client.get("/recommend", params={**p, "exclude": served}).json()["tracks"]
    assert {t["id"] for t in first}.isdisjoint({t["id"] for t in nxt})
