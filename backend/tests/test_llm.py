"""LLM fallback + edge-case tests (docs/EdgeCases.md §2). No API key required."""
from backend.data.models import ListenerPersona, Track
from backend.llm.client import (
    generate_why,
    judge_genre_adjacency,
    judge_genre_adjacency_fallback,
)
from backend.data.mock_library import get_persona_by_id, get_track_by_id

P1 = get_persona_by_id("p1")
T = get_track_by_id("t02")


def test_generate_why_fallback_nonempty():  # 2.1
    line = generate_why(T, P1, use_fallback=True)
    assert isinstance(line, str) and len(line) > 10


def test_why_no_forbidden_phrases():  # 2.5
    line = generate_why(T, P1, use_fallback=True).lower()
    assert "algorithm" not in line and "recommendation" not in line


def test_why_empty_artists():  # 2.7
    p = ListenerPersona("z", "Z", "Indie Folk", [], [], {})
    assert len(generate_why(T, p, use_fallback=True)) > 5


def test_why_empty_genre_tags():  # 2.8
    bare = Track("x", "X", "Y", "", [], 50, {"valence": 0.6}, 2020)
    assert len(generate_why(bare, P1, use_fallback=True)) > 5


def test_adjacency_fallback_known():
    ok, _ = judge_genre_adjacency_fallback("Chamber Folk", "Indie Folk")
    assert ok is True


def test_adjacency_unknown_genre():  # 2.9
    ok, reason = judge_genre_adjacency("Chamber Folk", "Polka", use_fallback=True)
    assert ok is False and "diverges" in reason.lower()


def test_adjacency_self():  # 2.10
    ok, _ = judge_genre_adjacency("Indie Folk", "indie folk")
    assert ok is True


def test_adjacency_consistent():  # 2.x determinism
    a = judge_genre_adjacency("Drone", "Ambient", use_fallback=True)
    b = judge_genre_adjacency("Drone", "Ambient", use_fallback=True)
    assert a == b


def test_llm_error_falls_back(monkeypatch):  # 2.2
    import backend.llm.client as c
    monkeypatch.setattr(c, "has_api_key", lambda: True)
    monkeypatch.setattr(c, "call_llm", lambda p: (_ for _ in ()).throw(RuntimeError("boom")))
    assert len(generate_why(T, P1)) > 5  # fell back, no crash
