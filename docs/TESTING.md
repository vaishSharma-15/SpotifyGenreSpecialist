# Discovery DJ — Testing

## Running

```bash
pip install -r backend/requirements.txt
python3 -m pytest -q          # from repo root
```

All tests run in **mock mode** (`DATA_SOURCE=mock`) with **no API key** — fully
deterministic, no network. **58 tests passing.**

## Suites (`backend/tests/`)

| File | Covers | Phase |
|------|--------|-------|
| `test_engine.py` | genre lock, popularity ceiling, novelty filter, taste-fit ranking, empty pools | 1 |
| `test_deezer.py` | Deezer provider parsing + derived descriptors, resilience | 1 |
| `test_mood.py` | mood targets, scoring, `filter_by_mood`, genre+mood catalog | 1 |
| `test_clean.py` | validity drop, dedup (id + title/artist), mood categorization | 1 |
| `test_llm.py` | why-line + adjacency fallbacks, provider precedence, `call_llm` parsing, graceful error | 2 |
| `test_integration.py` | API edge cases (`docs/EdgeCases.md` §3): 4xx handling, endless discovery | 3 |
| `test_phase4.py` | end-to-end flows + success criteria (below) | 4 |

## Phase 4 success-criteria coverage (`test_phase4.py`)

| Test | Success criterion |
|------|-------------------|
| `test_end_to_end_home_shelf` | persona → recs → why-lines |
| `test_genre_lock_enforced_at_all_dial_positions` | genre lock holds at every dial |
| `test_popularity_distribution` | Safe > Adventurous popularity |
| `test_novelty_filter_persistence` | excluded tracks stay excluded |
| `test_why_line_grounding` | why-lines reference concrete detail |
| `test_fallback_without_api_key` | app works with no LLM key |
| `test_genre_adjacency_edge_cases` | adjacency sensible (chamber folk ✓, polka ✗) |
| `test_performance_under_500ms` | `/recommend` < 500 ms |

## Manual QA checklist (`§4.2`)

Run the app (`README.md`) and verify:

- [x] Why-lines are specific (real Groq output, not templates) — verified live
- [x] Why-lines pass "would a real fan agree?" — e.g. *"1612's Chamber Folk sound resonates with Fleet Foxes' harmony-rich style"*
- [x] Genre-adjacency calls sensible — Chamber Folk ✓ / Polka ✗
- [x] UI loads without lag — `/recommend` < 500 ms
- [x] Baseline toggle provides clear comparison — Discovery screen
- [x] Feedback log accurate and readable — Sidebar "Recent Activity"

## Notes
- With a real key in `backend/.env`, why-lines/adjacency use the live LLM; the
  suite still forces the fallback path so results stay deterministic.
- Frontend type-checks via `cd frontend && npm run build` (`tsc -b`).
