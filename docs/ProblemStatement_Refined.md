# Discovery DJ MVP — Problem Statement & Opportunity

## Executive Summary

**Discovery DJ** is a web-based music discovery feature that mimics Spotify's interface and solves its core recommendation problem for *Genre Specialists*—a defined, high-value listener segment (32.9% of analyzed reviews, n=545) who want deeper exploration within their preferred genre, not broader recommendations to the safe, popular center. Currently, Spotify's algorithm defaults to mass-appeal hits, driving these listeners to TikTok, YouTube, and Instagram for real discovery.

This MVP delivers an explainable, depth-focused recommendation experience within a single locked genre, powered by LLM reasoning for discovery judgment and grounded justifications. The UI is built with React and uses Spotify's design language (dark theme, green accents) to feel native and familiar.

---

## Problem Definition

### The User Segment: Genre Specialists
- **Size:** 32.9% of Spotify's active listener base (largest single segment)
- **Pain:** 17.4% report repetitive recommendations, lack of discovery
- **Behavior:** Actively seek deeper cuts within their core genre; willing to use third-party tools if Spotify doesn't deliver
- **Churn risk:** High—migration to audio discovery on TikTok/YouTube indicates unmet needs

### Current State Gaps
1. **One-dimensional optimization** — Spotify's algorithm maximizes engagement (play-through rate, save rate) alone, which mathematically drifts toward popular, safe choices
2. **Co-occurrence blindness** — Recommendations only account for songs that share listeners; deep genre cuts with no playlist overlap are invisible
3. **Zero explanation** — Every recommendation is a black box; listeners can't understand *why* a track was suggested, eroding trust
4. **No genre-depth control** — Users cannot signal "stay in my lane but surprise me" vs. "go wild"

### Why This Requires AI, Not Just Better Rules

| Traditional Approach | Discovery DJ (AI-Powered) |
|---|---|
| **Single scalar optimization** → drifts to popular center | **Multi-objective reasoning** → balances engagement *and* novelty *and* genre alignment |
| **Co-occurrence only** → misses deep-cut adjacencies | **LLM genre reasoning** → understands sonic/conceptual bridges (e.g., chamber folk → ambient folk) even with zero shared listeners |
| **Black-box rankings** → "why this track?" is unanswerable | **Grounded explanations** → every rec includes a specific, genre-aware why-line, not a template |

**Two core functions must be AI (LLM reasoning):**
1. **Why-line generation** — one-sentence, grounded justification for each recommendation, specific to the listener's taste and the track's profile
2. **Genre-adjacency judgment** — determines whether a candidate is "deep but on-topic" vs. "off-topic," using genre lineage and sonic reasoning

**Everything else is deterministic code:**
- Novelty filtering (exclude recently played, saved skips)
- Popularity ceiling enforcement (controlled by Safe ↔ Adventurous dial)
- Ranking within approved pools
- User feedback logging

---

## Scope: MVP (Web-Based Feature)

### Implementation Approach
**This is a web-based feature** that mimics Spotify's native interface, built with React. It integrates Spotify's design language (dark theme, green accents, card layouts) and feels like a native Spotify experience. The backend reads Spotify-shaped data (mock, initially) and powers the recommendation logic.

### Screens & Features

#### Screen 1: Home Shelf
- Displays **4–5 recommendations** all within the locked genre
- Ranked by fit to listener's taste profile
- Each card displays:
  - Track name, artist, album art
  - AI-generated why-line (one grounded sentence)
  - Save / Skip / Replay actions (logged)

#### Screen 2: Autoplay Moment
- Simulates "playlist ended" scenario
- Returns **one next-track** with the same why-line logic
- **Toggle:** side-by-side comparison with "baseline Autoplay" (genre-agnostic, no explanation) to visualize the difference
- Logged feedback feeds a visible history

#### Shared Controls (Persistent Across Screens)
1. **Genre Lock** — listener selects once; all recs stay within that genre (e.g., "Indie Folk")
2. **Safe ↔ Adventurous Dial** — controls popularity ceiling for candidates
   - Safe = top 40% popularity within genre
   - Adventurous = bottom 20% popularity (deep cuts)
3. **Feedback Panel** — visible log of saves, skips, and replays

---

## Data Model (MVP Phase)

### Mock Data Structure
- **Track Library:** 15–25 hand-curated tracks spanning 2–3 genres
  - Fields: title, artist, genre_tags (array), popularity_score (0–100), sound_descriptors (energy, valence, tempo)
- **Listener Personas:** 2–3 preset profiles
  - top_genre, top_artists (3–5), recently_played (list of 5–8 track IDs), preference_vector

### Why Mock Data?
Spotify's `/recommendations` and `/audio-features` endpoints are blocked for new developer apps (as of February 2026). Mock data allows the MVP to run without API dependency, proving core logic before considering real-data integration.

---

## Success Criteria

### Functional
✅ Genre lock enforced at every dial position  
✅ Adventurous dial returns lower-popularity picks than Safe dial  
✅ Novelty filter prevents repeat recommendations  
✅ Why-lines are grounded (not generic templates) and pass peer review  
✅ Genre-adjacency calls are sensible (manual test: chamber folk ← indie folk ✓)  

### User Experience
✅ Save rate on recommendations ≥ 65% (vs. baseline ≥ 45% on today's Autoplay)  
✅ Why-line readability = "a real genre fan would agree with this"  
✅ UI loads recs in < 500ms (perception of no lag)  

### Code Quality
✅ Recommendation logic has zero UI dependencies (testable in isolation)  
✅ AI calls have graceful fallbacks (why-lines work without API key)  
✅ Test coverage ≥ 85% on core deterministic functions  
✅ AI vs. deterministic boundary is clearly documented (README + inline comments)

---

## Build Deliverables

1. **`recommendation_engine/`** — Core recommendation module
   - Mock track library & personas
   - Genre-lock filter
   - Popularity-ceiling function (driven by dial)
   - Novelty filter
   - Ranking function (taste-profile fit)

2. **`llm_module/`** — LLM integration layer
   - `generate_why(track, persona)` with non-AI fallback
   - `judge_genre_adjacency(candidate_genre, user_genre)` with reasoning
   - Environment-based API key handling (optional, graceful failure)

3. **`ui/`** — React web app (Spotify-themed)
   - Home Shelf screen (Spotify-style card grid)
   - Discovery screen (Autoplay-moment equivalent)
   - Persistent sidebar (genre lock, dial, listening history)
   - Baseline toggle for comparison
   - Responsive design, dark theme with Spotify green (#1DB954)

4. **`tests/`** — Automated test suite
   - Genre-lock enforcement
   - Popularity ceiling enforcement
   - Novelty filter correctness
   - Fallback why-line generation
   - Genre-adjacency test cases

5. **Documentation**
   - README: explicit statement of AI vs. deterministic logic
   - Inline comments: boundary between LLM calls and rule-based logic
   - Architecture overview

---

## Future Considerations (Out of Scope)

- Real Spotify OAuth integration
- Playlist-level recommendations (currently track-only)
- User preference learning / model retraining (logging only, MVP)
- Collaborative filtering (single-user focus)
- Mobile app version

