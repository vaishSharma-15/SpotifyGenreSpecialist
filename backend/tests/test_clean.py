"""Data cleaning + mood categorization tests (deterministic, offline)."""
from backend.data.clean import clean_tracks
from backend.data import mood as mood_mod
from backend.data.models import Track


def _t(tid, title, artist, energy=0.5, valence=0.5):
    return Track(tid, title, artist, "", ["Rock"], 50.0,
                 {"energy": energy, "valence": valence, "tempo": 120})


def test_drops_placeholder_rows():
    tracks = [_t("1", "Unknown", "Unknown"), _t("2", "Real Song", "Real Artist")]
    out = clean_tracks(tracks)
    assert [t.id for t in out] == ["2"]


def test_dedup_by_id():
    tracks = [_t("1", "A", "X"), _t("1", "A", "X")]
    assert len(clean_tracks(tracks)) == 1


def test_dedup_by_title_artist_case_insensitive():
    tracks = [_t("1", "Kesariya", "Arijit Singh"), _t("2", "  kesariya ", "ARIJIT  SINGH")]
    assert len(clean_tracks(tracks)) == 1  # same song, different source ids


def test_every_track_gets_a_mood():
    out = clean_tracks([_t("1", "A", "X", energy=0.9, valence=0.7),
                        _t("2", "B", "Y", energy=0.2, valence=0.5)])
    assert all(t.mood for t in out)
    assert all(mood_mod.is_mood(t.mood) for t in out)


def test_classify_mood_direction():
    hype = _t("1", "A", "X", energy=0.95, valence=0.7)
    calm = _t("2", "B", "Y", energy=0.18, valence=0.6)
    assert mood_mod.classify_mood(hype) == "Energetic"
    assert mood_mod.classify_mood(calm) in ("Soothing", "Calm", "Chill")


def test_order_preserved():
    out = clean_tracks([_t("3", "C", "Z"), _t("1", "A", "X"), _t("2", "B", "Y")])
    assert [t.id for t in out] == ["3", "1", "2"]
