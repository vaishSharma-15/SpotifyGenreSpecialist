"""Phase 1 mood-ingestion tests (deterministic, mock-mode — no network)."""
import os

os.environ["DATA_SOURCE"] = "mock"  # force offline path before catalog imports

from backend.data import mood as mood_mod
from backend.data import catalog
from backend.data.models import Track


def _track(tid, energy, valence, genre="Ambient"):
    return Track(id=tid, title=tid, artist="x", album_art_url="",
                 genre_tags=[genre], popularity_score=50.0,
                 sound_descriptors={"energy": energy, "valence": valence, "tempo": 120})


def test_list_moods_nonempty():
    names = {m["name"] for m in mood_mod.list_moods()}
    assert {"Chill", "Energetic", "Happy", "Melancholic"} <= names


def test_mood_score_bounds_and_direction():
    calm = _track("calm", 0.2, 0.5)
    hype = _track("hype", 0.95, 0.7)
    # Chill target is low-energy: the calm track must score higher.
    assert mood_mod.mood_score(calm, "Chill") > mood_mod.mood_score(hype, "Chill")
    assert 0.0 <= mood_mod.mood_score(hype, "Chill") <= 1.0


def test_filter_by_mood_ranks_closest_first():
    tracks = [_track("hype", 0.95, 0.7), _track("calm", 0.2, 0.5), _track("mid", 0.5, 0.5)]
    out = mood_mod.filter_by_mood(tracks, "Chill", limit=3, min_score=0.0)
    assert out[0].id == "calm"


def test_filter_never_returns_empty_when_input_nonempty():
    tracks = [_track("hype", 0.99, 0.99)]  # far from Melancholic target
    out = mood_mod.filter_by_mood(tracks, "Melancholic", limit=5)
    assert out  # relaxes min_score rather than returning nothing


def test_invalid_mood_passthrough():
    tracks = [_track("a", 0.5, 0.5)]
    assert mood_mod.filter_by_mood(tracks, "NotAMood", limit=5) == tracks


def test_catalog_genre_mood_returns_matching_genre_tracks():
    recs = catalog.tracks_for_genre_mood("Ambient", "Chill", limit=5)
    assert recs, "expected mock Ambient tracks"
    assert all("Ambient" in t.genre_tags for t in recs)


def test_catalog_genre_mood_invalid_mood_falls_back_to_genre():
    recs = catalog.tracks_for_genre_mood("Ambient", "Bogus", limit=5)
    assert recs
    assert all("Ambient" in t.genre_tags for t in recs)
