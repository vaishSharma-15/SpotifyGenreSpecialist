"""Live Deezer provider tests. Skip automatically when offline."""
import pytest

from backend.data import deezer_provider as dz


def _online() -> bool:
    try:
        dz.list_genres()
        return True
    except dz.DeezerUnavailable:
        return False


pytestmark = pytest.mark.skipif(not _online(), reason="Deezer API unreachable (offline)")


def test_list_genres_real():
    genres = dz.list_genres()
    assert genres and all("id" in g and "name" in g for g in genres)


def test_tracks_for_genre_real():
    genres = dz.list_genres()
    name = genres[0]["name"]
    tracks = dz.tracks_for_genre(name, limit=10)
    assert tracks
    for t in tracks:
        assert t.id.startswith("dz")
        assert 0.0 <= t.popularity_score <= 100.0
        assert 0.0 <= t.sound_descriptors["energy"] <= 1.0
        assert 0.0 <= t.sound_descriptors["valence"] <= 1.0
