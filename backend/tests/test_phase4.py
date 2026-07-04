"""Phase 4 comprehensive suite (docs/PhaseWiseArchitecture.md §4.1).

End-to-end flows + the success-criteria checks (grounding, fallback, adjacency,
<500ms performance). Runs in mock mode: deterministic, no network, no API key.
"""
import os
import time

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

os.environ["FEEDBACK_LOG"] = "/tmp/discovery_dj_phase4_feedback.json"
os.environ["DATA_SOURCE"] = "mock"
for _k in ("ANTHROPIC_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"):
    os.environ.pop(_k, None)  # force fallback path (no-key success criterion)
if os.path.exists(os.environ["FEEDBACK_LOG"]):
    os.remove(os.environ["FEEDBACK_LOG"])

from backend.api import app  # noqa: E402

client = TestClient(app)


def test_end_to_end_home_shelf():
    """Full flow: persona -> recs -> why-lines."""
    recs = client.get("/recommend", params={
        "persona_id": "p1", "locked_genre": "Indie Folk", "limit": 4}).json()["tracks"]
    assert recs
    for t in recs:
        w = client.post("/why-line", params={"track_id": t["id"], "persona_id": "p1"})
        assert w.status_code == 200 and len(w.json()["why_line"]) > 10


def test_genre_lock_enforced_at_all_dial_positions():
    for dial in (0.0, 0.25, 0.5, 0.75, 1.0):
        recs = client.get("/recommend", params={
            "persona_id": "p1", "locked_genre": "Indie Folk",
            "dial_position": dial, "limit": 10}).json()["tracks"]
        assert all("Indie Folk" in t["genre_tags"] for t in recs)


def test_popularity_distribution():
    """Safe dial returns higher-popularity picks than Adventurous."""
    safe = client.get("/recommend", params={
        "persona_id": "p2", "locked_genre": "Ambient", "dial_position": 0.0,
        "limit": 10}).json()["tracks"]
    adv = client.get("/recommend", params={
        "persona_id": "p2", "locked_genre": "Ambient", "dial_position": 1.0,
        "limit": 10}).json()["tracks"]
    avg = lambda ts: sum(t["popularity_score"] for t in ts) / len(ts)
    assert safe and adv and avg(safe) > avg(adv)


def test_novelty_filter_persistence():
    client.post("/feedback", json={"persona_id": "p2", "track_id": "t07", "action": "SKIP"})
    for _ in range(2):  # remains excluded across repeated fetches
        recs = client.get("/recommend", params={
            "persona_id": "p2", "locked_genre": "Ambient", "dial_position": 1}).json()["tracks"]
        assert "t07" not in {t["id"] for t in recs}


def test_why_line_grounding():
    """Why-line references concrete detail (genre/artist), not a generic blurb."""
    recs = client.get("/recommend", params={
        "persona_id": "p1", "locked_genre": "Indie Folk", "limit": 3}).json()["tracks"]
    t = recs[0]
    why = client.post("/why-line", params={"track_id": t["id"], "persona_id": "p1"}).json()["why_line"]
    grounded = ("Indie Folk" in why or t["artist"] in why or "Fleet Foxes" in why
                or "Bon Iver" in why or "Big Red Machine" in why)
    assert grounded, why


def test_fallback_without_api_key(monkeypatch):
    """App is fully functional with no LLM key (why-line still returned)."""
    from backend.llm import config
    # A local .env may provide a real key; null it out to exercise the fallback.
    monkeypatch.setattr(config.LLMConfig, "ANTHROPIC_KEY", None)
    monkeypatch.setattr(config.LLMConfig, "GROQ_KEY", None)
    monkeypatch.setattr(config.LLMConfig, "OPENAI_KEY", None)
    assert config.has_api_key() is False
    w = client.post("/why-line", params={"track_id": "t02", "persona_id": "p1"})
    assert w.status_code == 200 and len(w.json()["why_line"]) > 10


def test_genre_adjacency_edge_cases():
    on = client.get("/adjacency", params={
        "candidate_genre": "Chamber Folk", "user_genre": "Indie Folk"}).json()
    off = client.get("/adjacency", params={
        "candidate_genre": "Polka", "user_genre": "Indie Folk"}).json()
    assert on["is_adjacent"] is True and off["is_adjacent"] is False


def test_performance_under_500ms():
    start = time.perf_counter()
    r = client.get("/recommend", params={
        "persona_id": "p1", "locked_genre": "Indie Folk", "limit": 5})
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert r.status_code == 200
    assert elapsed_ms < 500, f"took {elapsed_ms:.0f}ms"
