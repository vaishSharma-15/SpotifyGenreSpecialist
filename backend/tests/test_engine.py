"""Deterministic engine + edge-case tests (docs/EdgeCases.md §1)."""
from backend.data.mock_library import TRACK_LIBRARY, get_persona_by_id
from backend.engine.novelty_manager import NoveltyManager
from backend.engine.recommendation import (
    apply_genre_lock,
    apply_popularity_ceiling,
    cosine_similarity,
    get_recommendations,
    normalize_tempo,
    rank_by_taste_fit,
)

P1 = get_persona_by_id("p1")  # Indie Folk


def test_genre_lock_enforced():
    out = apply_genre_lock(TRACK_LIBRARY, "Indie Folk")
    assert out and all(any(g == "Indie Folk" for g in t.genre_tags) for t in out)


def test_genre_lock_case_insensitive():  # 2.11
    assert apply_genre_lock(TRACK_LIBRARY, "indie folk ")


def test_genre_lock_unknown_returns_empty():  # 1.3
    assert apply_genre_lock(TRACK_LIBRARY, "Polka") == []


def test_popularity_ceiling_safe_vs_adventurous():  # 1.4 relationship
    genre = apply_genre_lock(TRACK_LIBRARY, "Indie Folk")
    safe = apply_popularity_ceiling(genre, 0.0)
    adv = apply_popularity_ceiling(genre, 1.0)
    assert len(adv) >= len(safe)
    assert min(t.popularity_score for t in adv) <= min(t.popularity_score for t in safe)


def test_dial_out_of_bounds_clamped():  # 1.5
    genre = apply_genre_lock(TRACK_LIBRARY, "Indie Folk")
    assert apply_popularity_ceiling(genre, -3.0) == apply_popularity_ceiling(genre, 0.0)
    assert apply_popularity_ceiling(genre, 9.0) == apply_popularity_ceiling(genre, 1.0)


def test_cosine_zero_vector():  # 1.9
    assert cosine_similarity([0, 0, 0], [1, 2, 3]) == 0.0


def test_normalize_tempo_clamped():  # 1.10
    assert normalize_tempo(40) == 0.0
    assert normalize_tempo(240) == 1.0


def test_limit_larger_than_pool():  # 1.2
    recs = get_recommendations(P1, "Indie Folk", 1.0, set(), limit=99)
    assert len(recs) <= 99 and len(recs) == len({t.id for t in recs})


def test_limit_zero():  # 3.4
    assert get_recommendations(P1, "Indie Folk", 0.5, set(), limit=0) == []


def test_empty_pool_after_filters():  # 1.1
    all_ids = {t.id for t in TRACK_LIBRARY}
    assert get_recommendations(P1, "Indie Folk", 1.0, all_ids, limit=5) == []


def test_novelty_excludes_saves_and_skips():  # 1.6
    nm = NoveltyManager()
    nm.mark_skip("p1", "t03")
    nm.mark_save("p1", "t02")
    recs = get_recommendations(P1, "Indie Folk", 1.0, nm.get_excluded("p1"), limit=5)
    ids = {t.id for t in recs}
    assert "t03" not in ids and "t02" not in ids


def test_ranking_deterministic():  # 1.7
    genre = apply_genre_lock(TRACK_LIBRARY, "Indie Folk")
    assert [t.id for t in rank_by_taste_fit(genre, P1)] == [t.id for t in rank_by_taste_fit(genre, P1)]


def test_missing_descriptors_default():  # 1.8 / 5.4
    from backend.data.models import Track
    from backend.engine.recommendation import taste_fit_score
    bare = Track("x", "X", "Y", "", ["Indie Folk"], 50, {}, 2020)
    assert 0.0 <= taste_fit_score(bare, P1) <= 1.0
