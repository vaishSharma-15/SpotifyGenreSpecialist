# Discovery DJ MVP — Edge Cases & Handling Specification

This document enumerates the edge cases the Discovery DJ MVP must handle, mapped to
the layers defined in [PhaseWiseArchitecture.md](./PhaseWiseArchitecture.md) and the
success criteria in [ProblemStatement_Refined.md](./ProblemStatement_Refined.md).

Each edge case lists: **Trigger → Expected Behavior → Layer → Test Hook**.

Legend for layers:
- **ENGINE** = `engine/recommendation.py` (deterministic)
- **LLM** = `llm/client.py` (AI + fallback)
- **API** = `backend/api.py` (FastAPI)
- **UI** = `frontend/src/*` (React)
- **DATA** = `data/*` (mock library, personas, feedback log)

---

## 1. Recommendation Engine (Deterministic)

### 1.1 Empty pool after all filters
- **Trigger:** Genre lock + popularity ceiling + novelty filter remove every track.
- **Expected:** Return `[]` (never raise). Pipeline degrades gracefully; the caller
  decides messaging. Covered by `test_empty_pool_after_filters`.
- **Layer:** ENGINE

### 1.2 Fewer results than `limit`
- **Trigger:** Only 2 valid tracks remain but `limit=5`.
- **Expected:** Return the 2 available tracks, do **not** pad with duplicates,
  invalid-genre, or excluded tracks. Length ≤ `limit` is always acceptable.
- **Layer:** ENGINE

### 1.3 Genre lock matches no tracks
- **Trigger:** `locked_genre` not present in any track's `genre_tags`
  (typo, unseeded genre).
- **Expected:** Return `[]`. Genre lock is never silently relaxed — enforced at
  **every** dial position (functional success criterion).
- **Layer:** ENGINE / DATA

### 1.4 Popularity ceiling excludes everything
- **Trigger:** Safe dial (0.0 → `popularity >= 60`) but genre pool is all deep cuts
  (< 60).
- **Expected:** Return `[]`. Do not auto-loosen the ceiling. Adventurous dial must
  still return strictly lower-popularity picks than Safe (functional criterion).
- **Layer:** ENGINE

### 1.5 Dial position out of bounds
- **Trigger:** `dial_position` < 0.0 or > 1.0 (bad slider value, API abuse).
- **Expected:** Clamp to `[0.0, 1.0]` before applying ceiling. Never crash.
- **Layer:** ENGINE / API

### 1.6 All tracks excluded by novelty filter
- **Trigger:** Every genre-valid track is in `recently_played` or session skips.
- **Expected:** Return `[]`. Saved/skipped tracks must **never** resurface in the
  same session (`test_novelty_filter_excludes_saves/skips`).
- **Layer:** ENGINE

### 1.7 Ties in taste-fit score
- **Trigger:** Two tracks share an identical cosine score.
- **Expected:** Deterministic tie-break by recency (newer `release_year` ranked
  higher), as specified. Same input ⇒ same order (reproducible).
- **Layer:** ENGINE

### 1.8 Missing / malformed sound descriptors
- **Trigger:** A track lacks `energy`, `valence`, or `tempo`.
- **Expected:** Use documented defaults (`energy=0.5`, `valence=0.5`, `tempo=120`)
  via `.get(...)`. Scoring never throws on a missing key.
- **Layer:** ENGINE / DATA

### 1.9 Zero-magnitude vector in cosine similarity
- **Trigger:** A track or persona vector normalizes to all-zeros → division by zero.
- **Expected:** Guard against `||v|| == 0`; return score `0.0` instead of `NaN`/error.
- **Layer:** ENGINE

### 1.10 Tempo normalization out of expected band
- **Trigger:** `tempo` far outside 80–180 BPM (e.g. 40 or 240).
- **Expected:** Clamp normalized tempo to `[0, 1]` so it never distorts cosine
  similarity or produces > 1 scores.
- **Layer:** ENGINE

### 1.11 Duplicate track IDs in library
- **Trigger:** Mock data seeded with a repeated `id`.
- **Expected:** IDs are unique by contract; a startup/data-load assertion should
  fail loudly. De-dupe defensively so a recommendation list has no repeats.
- **Layer:** DATA

---

## 2. LLM Module (AI + Fallback)

### 2.1 No API key configured
- **Trigger:** `OPENAI_API_KEY` unset/empty.
- **Expected:** Silently use `generate_why_fallback` / `judge_genre_adjacency_fallback`.
  App is fully functional (core success criterion + `test_api_key_missing_graceful`).
- **Layer:** LLM

### 2.2 LLM call raises / times out
- **Trigger:** Network error, rate limit, 5xx, timeout mid-request.
- **Expected:** Catch the exception and fall back to the template/rule-based path.
  A why-line failure must **never** break a recommendation response.
- **Layer:** LLM / API

### 2.3 LLM returns empty or whitespace
- **Trigger:** Model returns `""` or only whitespace.
- **Expected:** Treat as failure → fall back. Never surface a blank why-line to UI.
- **Layer:** LLM

### 2.4 LLM why-line too long / too short
- **Trigger:** Response exceeds the 15–25 word target or is a single word.
- **Expected:** Enforce brevity (`MAX_TOKENS`) and truncate/trim; if degenerate,
  fall back. `test_why_line_length` guards the upper bound.
- **Layer:** LLM

### 2.5 LLM why-line leaks forbidden phrasing
- **Trigger:** Output mentions "our algorithm", "recommendations", or a raw template.
- **Expected:** Prompt forbids it; add a lightweight post-filter. Grounded, specific
  wording is a peer-review success criterion.
- **Layer:** LLM

### 2.6 Adjacency response unparseable
- **Trigger:** Model doesn't emit a clean `YES/NO` + reasoning shape.
- **Expected:** Default `is_adjacent=False` when the first line lacks `YES`, and
  supply empty/neutral reasoning rather than crashing on `lines[1]`.
- **Layer:** LLM

### 2.7 Persona with empty `top_artists`
- **Trigger:** Fallback templates index `persona.top_artists[0]` but list is empty.
- **Expected:** Guard the index; fall back to genre-only phrasing
  (e.g. "a deeper {genre} cut"). Never `IndexError`.
- **Layer:** LLM / DATA

### 2.8 Track with empty `genre_tags`
- **Trigger:** Fallback template references `track.genre_tags[0]`.
- **Expected:** Guard the index; use a neutral descriptor. Never `IndexError`.
- **Layer:** LLM / DATA

### 2.9 Genre not in the fallback adjacency map
- **Trigger:** `user_genre` absent from the hard-coded `adjacency_map`.
- **Expected:** `neighbors = []` ⇒ `is_adjacent=False` with a "diverges" reason.
  No `KeyError`.
- **Layer:** LLM

### 2.10 Self-adjacency
- **Trigger:** `candidate_genre == user_genre`.
- **Expected:** Treat as adjacent (`True`) — an on-genre deep cut is trivially
  on-topic. Don't let it fall through to "diverges".
- **Layer:** LLM

### 2.11 Case / whitespace mismatch in genre strings
- **Trigger:** `"indie folk"` vs `"Indie Folk"` between UI, data, and map keys.
- **Expected:** Normalize (trim + canonical case) before matching in both genre lock
  and adjacency lookups.
- **Layer:** ENGINE / LLM

---

## 3. API Layer (FastAPI)

### 3.1 Unknown `persona_id`
- **Trigger:** `/recommend` or `/why-line` with an ID not in the persona set.
- **Expected:** `404`/`400` with a clear message, not a 500 stack trace.
- **Layer:** API

### 3.2 Unknown `track_id`
- **Trigger:** `/why-line` or `/feedback` for a nonexistent track.
- **Expected:** `400` with descriptive detail; no partial state written.
- **Layer:** API

### 3.3 Invalid `action` on `/feedback`
- **Trigger:** `action` not in `{SAVE, SKIP, REPLAY}` (case/typo).
- **Expected:** Reject with `400`. Only the enum values are logged.
- **Layer:** API / DATA

### 3.4 Invalid `dial_position` / `limit` types
- **Trigger:** Non-numeric `dial_position`, negative `limit`, huge `limit`.
- **Expected:** FastAPI type validation + clamp `limit` to a sane max (e.g. library
  size). `limit=0` returns `[]`.
- **Layer:** API

### 3.5 CORS / wrong origin
- **Trigger:** Frontend served from a port other than the allow-listed Vite origin.
- **Expected:** Documented, configurable allowed origins; requests from unlisted
  origins are blocked by design.
- **Layer:** API

### 3.6 Concurrent feedback writes
- **Trigger:** Rapid Save/Skip clicks race on the persistent JSON feedback log.
- **Expected:** Serialize/append safely (lock or append-only writes) so no entry is
  lost or corrupts the file.
- **Layer:** API / DATA

### 3.7 Baseline on empty library
- **Trigger:** `/baseline` calls `random.choice(TRACK_LIBRARY)` when library empty.
- **Expected:** Guard empty library → `400`/empty payload, never `IndexError`.
- **Layer:** API

---

## 4. UI Layer (React)

### 4.1 Zero recommendations
- **Trigger:** API returns `tracks: []` (see 1.1/1.3/1.6).
- **Expected:** Show an explicit empty state, e.g. "No deeper cuts left at this
  adventurousness — try moving the dial or switching genre." Already stubbed in
  `HomeShelf` (`recs.length === 0`).
- **Layer:** UI

### 4.2 Why-line still loading
- **Trigger:** `/why-line` is slower than the card render.
- **Expected:** Show a skeleton/loading state per `useWhyLine.loading`; the card
  remains interactive (Save/Skip usable before the why-line arrives).
- **Layer:** UI

### 4.3 Broken / missing album art
- **Trigger:** `album_art_url` 404s or is empty.
- **Expected:** `onError` fallback to a placeholder tile; layout must not shift.
- **Layer:** UI

### 4.4 API unreachable
- **Trigger:** Backend down / network error on any hook.
- **Expected:** Render the `error` branch with a retry affordance, not a blank page.
- **Layer:** UI

### 4.5 Saving/skipping the last visible track
- **Trigger:** User skips the only remaining card.
- **Expected:** After the feedback logs, the list transitions to the empty state
  (4.1) rather than a stale/hanging card.
- **Layer:** UI

### 4.6 Rapid dial dragging
- **Trigger:** User scrubs the Safe↔Adventurous slider quickly.
- **Expected:** Debounce refetch to avoid request storms; latest dial value wins
  (ignore out-of-order responses). Keeps the < 500ms perceived-latency criterion.
- **Layer:** UI

### 4.7 Switching persona / genre mid-session
- **Trigger:** User changes persona or genre lock while recs are on screen.
- **Expected:** Refetch with new context; session skip state is per-persona (see
  `NoveltyManager` keyed by `persona_id`) so switching does not leak exclusions.
- **Layer:** UI / ENGINE

### 4.8 Baseline toggle re-randomization
- **Trigger:** Toggling the baseline comparison on/off repeatedly.
- **Expected:** Baseline fetched only when shown; a fresh random baseline per open
  is acceptable but must not overwrite the primary recommendation.
- **Layer:** UI

### 4.9 Duplicate rapid feedback clicks
- **Trigger:** Double-click Save.
- **Expected:** Debounce/disable the button after the first click so only one action
  logs per interaction.
- **Layer:** UI

---

## 4b. Real Data Source (Deezer)

Genre selection and recommendations are backed by the public **Deezer API**
(`backend/data/deezer_provider.py`), proxied through the backend and cached.
`DATA_SOURCE=deezer` (default) or `mock`.

### 4b.1 Deezer unreachable / timeout
- **Trigger:** Network down, rate-limited, or slow (> 4s).
- **Expected:** `DeezerUnavailable` is caught in `catalog.py`; transparently fall
  back to the mock library. App stays functional (same philosophy as LLM fallback).
- **Layer:** DATA

### 4b.2 Genre not found on Deezer
- **Trigger:** Selected genre name/id has no chart tracks.
- **Expected:** Fall back to a name search; if still empty, return `[]` and the UI
  shows the empty/finished state.
- **Layer:** DATA / UI

### 4b.3 Missing audio features
- **Trigger:** Deezer exposes no energy/valence (only rank, sometimes bpm).
- **Expected:** Derive a **stable heuristic** vector (popularity from `rank`, tempo
  from `bpm`/pseudo-BPM, energy from tempo, valence from a title hash) so taste-fit
  ranking still works and is reproducible across calls.
- **Layer:** DATA / ENGINE

### 4b.4 Endless discovery (playlist finished)
- **Trigger:** User finishes the served queue.
- **Expected:** Client re-calls `/recommend` with `exclude=<served IDs>`; backend
  returns the next batch of the **same** genre with no repeats. When nothing
  remains, `exhausted=true` drives a "genre finished" prompt.
- **Layer:** API / UI

### 4b.5 Why-line / feedback for a real track
- **Trigger:** Actions reference a Deezer track ID (`dz...`) not in mock data.
- **Expected:** The catalog remembers every served track (`_seen`), so `/why-line`
  and `/feedback` resolve real IDs. Unknown IDs still 400 (§3.2).
- **Layer:** API / DATA

---

## 5. Data & Persistence

### 5.1 Malformed mock data at load
- **Trigger:** Missing required field on a Track/Persona in `mock_library.py`.
- **Expected:** Fail fast at import with a clear error — bad data should never reach
  the engine silently.
- **Layer:** DATA

### 5.2 Corrupt / missing feedback log file
- **Trigger:** Feedback JSON absent or invalid on startup.
- **Expected:** Recreate an empty log; never crash the app on read.
- **Layer:** DATA

### 5.3 `recently_played` references unknown track IDs
- **Trigger:** Persona lists a track ID not in the library.
- **Expected:** Ignore unknown IDs in the novelty filter (set-difference is safe);
  no lookup error.
- **Layer:** DATA / ENGINE

### 5.4 Persona `preference_vector` missing keys
- **Trigger:** Vector lacks `energy_preference`, etc.
- **Expected:** Defaults applied (mirrors 1.8) so ranking is always computable.
- **Layer:** DATA / ENGINE

---

## 6. Cross-Cutting Invariants (must hold in every case)

1. **Genre lock is never violated** — no returned track lacks the locked genre, at
   any dial position.
2. **Adventurous ⊂ lower popularity than Safe** — the ceiling relationship never
   inverts.
3. **No resurfacing** — a saved/skipped track never reappears in the same session.
4. **Fallbacks are total** — every LLM path returns a usable string/decision without
   an API key.
5. **No 500s from user input** — bad params yield 4xx, not stack traces.
6. **Determinism** — identical inputs yield identical ranked output (reproducible).

---

## 7. Suggested Test Additions

Extend the suites named in the architecture doc:

| Test | File | Edge case |
|---|---|---|
| `test_dial_position_out_of_bounds` | `test_engine.py` | 1.5 |
| `test_cosine_zero_vector` | `test_engine.py` | 1.9 |
| `test_limit_larger_than_pool` | `test_engine.py` | 1.2 |
| `test_why_fallback_empty_artists` | `test_llm.py` | 2.7 |
| `test_adjacency_unknown_genre` | `test_llm.py` | 2.9 |
| `test_adjacency_self` | `test_llm.py` | 2.10 |
| `test_llm_timeout_falls_back` | `test_llm.py` | 2.2 |
| `test_unknown_persona_returns_4xx` | `test_integration.py` | 3.1 |
| `test_invalid_action_rejected` | `test_integration.py` | 3.3 |
| `test_baseline_empty_library` | `test_integration.py` | 3.7 |
