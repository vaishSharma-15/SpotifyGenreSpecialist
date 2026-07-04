# Discovery DJ MVP — Phase-Wise Architecture

## Architecture Overview

Discovery DJ is a **layered, modular architecture** with a clear separation between data logic (recommendation engine), AI reasoning (LLM module), and presentation (UI layer). This design ensures:
- **Testability:** core logic is independent of UI
- **Portability:** recommendation engine works with any frontend
- **Explainability:** AI boundaries are explicit
- **Resilience:** graceful fallbacks when AI services unavailable

```
┌──────────────────────────────────────────────────────────┐
│   React Frontend (Spotify-Like UI)                       │
│   - Home Shelf (grid of recommendations)                 │
│   - Discovery Screen (Autoplay moment)                   │
│   - Sidebar (genre lock, dial, history)                  │
│   - Dark theme + Spotify green accents                   │
└─────────────────┬──────────────────────────────────────┘
                  │ HTTP/REST
        ┌─────────┴──────────┐
        │                    │
┌───────▼──────────────────┐ │ ┌─────────────────────────┐
│   FastAPI Backend        │ │ │  LLM Module             │
│   - /recommend (GET)     │ │ │  - Why-line generation  │
│   - /why-line (POST)     │ │ │  - Genre adjacency      │
│   - /feedback (POST)     │ │ │  - Fallbacks            │
│   - /baseline (GET)      │ │ └─────────────────────────┘
└───────┬──────────────────┘ │
        │ imports            │
        └────────┬───────────┘
                 │
┌────────────────▼──────────────────────────────┐
│     Python Engine Layer (Recommendation)       │
│  - Track Pool & Filtering                      │
│  - Genre Lock, Popularity Ceiling              │
│  - Novelty Filter, Ranking                     │
└────────────────┬──────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────┐
│     Data Layer (Mock)                          │
│  - Track Library (15–25 tracks)               │
│  - Listener Personas (2–3 profiles)           │
│  - Sound Descriptors                          │
│  - Feedback Log (persistent JSON)             │
└───────────────────────────────────────────────┘
```

---

## Phase 1: Data & Core Foundation (Days 1–2)

### Goals
- Establish mock data contracts
- Build deterministic recommendation engine
- Create test harness

### Components

#### 1.1 Data Models (`data/models.py`)

**Track Model**
```python
@dataclass
class Track:
    id: str
    title: str
    artist: str
    album_art_url: str
    genre_tags: List[str]  # Primary + secondary genres
    popularity_score: float  # 0–100, controls Safe↔Adventurous
    sound_descriptors: Dict[str, float]
        # energy: 0–1
        # valence: 0–1 (happiness)
        # tempo: BPM (80–180 typical)
    release_year: int
```

**Listener Persona Model**
```python
@dataclass
class ListenerPersona:
    id: str
    name: str
    top_genre: str  # Primary listening context
    top_artists: List[str]  # 3–5 reference artists
    recently_played: List[str]  # Track IDs (5–10)
    preference_vector: Dict[str, float]
        # energy_preference: 0–1 (how active they like their music)
        # valence_preference: 0–1
        # tempo_preference: BPM target
        # genre_openness: 0–1 (adjacency tolerance)
```

**User Action Model**
```python
@dataclass
class UserAction:
    timestamp: datetime
    persona_id: str
    track_id: str
    action: Enum["SAVE", "SKIP", "REPLAY"]
    screen: Enum["HOME_SHELF", "AUTOPLAY_MOMENT"]
    context: Dict  # For future analysis
```

#### 1.2 Mock Data (`data/mock_library.py`)

**Track Library:** 18 hand-curated tracks
```
3 Indie Folk:
  - Fleet Foxes - White Winter Hymnal (pop-accessible)
  - Vulfpeck - 1612 (chamber-folk adjacent)
  - S. Carey - Buffy (deep cut)

3 Ambient:
  - Ólafur Arnalds - Re:member (orchestral-ambient)
  - Ben Frost - All That I've Got... (drone-adjacent)
  - Nils Frahm - Felt (minimalist-ambient)

3 Math Rock:
  - TTNG - E-Mei (poly-rhythm core)
  - Don Caballero - A Lot of People Died (avant-garde)
  - Adebisi Shaffo - Omwa Tey (hypnotic)

... etc.
```

**Listener Personas:** 3 profiles
```
Persona 1: "Deep Folk Lover"
  - Top genre: Indie Folk
  - Top artists: Fleet Foxes, Bon Iver, Big Red Machine
  - Recently played: [Track IDs of recent folk]
  - Preference vector: high_valence, moderate_energy

Persona 2: "Ambient Explorer"
  - Top genre: Ambient
  - Top artists: Ólafur Arnalds, Nils Frahm, Jon Hopkins
  - Preference vector: low_energy, low_valence, slow_tempo

... (repeat for 3rd persona)
```

---

### 1.3 Recommendation Engine (`engine/recommendation.py`)

**Core Responsibility:** Given a listener state and dial position, return a ranked pool of valid recommendations.

#### Function Signatures

```python
def apply_genre_lock(
    all_tracks: List[Track],
    locked_genre: str
) -> List[Track]:
    """
    Filter tracks by genre tag match.
    - Exact match on locked_genre
    - Return all tracks with locked_genre in their tag list
    """

def apply_popularity_ceiling(
    tracks: List[Track],
    dial_position: float  # 0.0 (Safe) to 1.0 (Adventurous)
) -> List[Track]:
    """
    Filter by popularity based on dial position.
    - dial_position = 0.0 → keep popularity >= 60 (top 40% tier)
    - dial_position = 0.5 → keep popularity >= 40 (middle tier)
    - dial_position = 1.0 → keep popularity >= 10 (bottom 20%, deep cuts)
    """

def apply_novelty_filter(
    tracks: List[Track],
    excluded_ids: Set[str]  # Recently played, skipped
) -> List[Track]:
    """
    Remove any track in excluded_ids.
    - Track is excluded if:
      * In recently_played (last 7 days, configurable)
      * Marked as skipped in current session
    """

def rank_by_taste_fit(
    tracks: List[Track],
    persona: ListenerPersona
) -> List[Track]:
    """
    Score each track by alignment to persona's preference vector.
    - Cosine similarity between track sound_descriptors 
      and persona preference_vector
    - Sort descending by score
    - Ties broken by recency (newer tracks ranked higher)
    """

def get_recommendations(
    persona: ListenerPersona,
    locked_genre: str,
    dial_position: float,  # 0.0–1.0
    excluded_ids: Set[str],
    limit: int = 5
) -> List[Track]:
    """
    Orchestrate the pipeline:
    1. Genre lock
    2. Popularity ceiling
    3. Novelty filter
    4. Rank by taste fit
    5. Return top `limit` tracks
    """
```

#### Novelty Filter State
```python
class NoveltyManager:
    """Tracks excluded tracks per persona, per session."""
    def __init__(self):
        self.excluded = {}  # persona_id -> Set[track_id]
    
    def mark_skip(self, persona_id: str, track_id: str):
        """User skipped; don't resurface."""
    
    def mark_save(self, persona_id: str, track_id: str):
        """User saved; don't resurface in THIS session."""
    
    def get_excluded(self, persona_id: str) -> Set[str]:
        """Return all excluded IDs for persona."""
```

#### Taste-Fit Scoring
```python
def taste_fit_score(
    track: Track,
    persona: ListenerPersona
) -> float:
    """
    Cosine similarity between:
    - track.sound_descriptors (energy, valence, tempo)
    - persona.preference_vector (same keys)
    
    Returns: float in [0, 1]
    """
    track_vector = [
        track.sound_descriptors.get('energy', 0.5),
        track.sound_descriptors.get('valence', 0.5),
        normalize_tempo(track.sound_descriptors.get('tempo', 120))
    ]
    
    persona_vector = [
        persona.preference_vector.get('energy_preference', 0.5),
        persona.preference_vector.get('valence_preference', 0.5),
        normalize_tempo(persona.preference_vector.get('tempo_preference', 120))
    ]
    
    return cosine_similarity(track_vector, persona_vector)
```

---

### 1.4 Testing (`tests/test_engine.py`)

**Test Suite for Deterministic Logic**

```python
def test_genre_lock_enforced():
    """All returned tracks have locked genre."""
    
def test_popularity_ceiling_safe():
    """Safe dial (0.0) filters to high-popularity only."""
    
def test_popularity_ceiling_adventurous():
    """Adventurous dial (1.0) includes low-popularity deep cuts."""
    
def test_novelty_filter_excludes_skips():
    """Skipped tracks never appear in recommendations."""
    
def test_novelty_filter_excludes_saves():
    """Saved tracks don't resurface in same session."""
    
def test_ranking_respects_taste_fit():
    """Higher taste-fit scores rank higher."""
    
def test_empty_pool_after_filters():
    """Graceful handling when no tracks pass all filters."""
```

---

## Phase 2: LLM Integration & AI Reasoning (Days 3–4)

### Goals
- Build LLM module with two core functions
- Implement graceful fallbacks (no API key dependency)
- Test reasoning quality

### Components

#### 2.1 LLM Client (`llm/client.py`)

**Why-Line Generation**

```python
def generate_why(
    track: Track,
    persona: ListenerPersona,
    use_fallback: bool = False  # Force fallback for testing
) -> str:
    """
    Generate one grounded sentence explaining why this track fits.
    
    Args:
        track: The recommended track
        persona: The listener persona
        use_fallback: If True, skip LLM, use template
    
    Returns:
        str: One sentence, specific, non-generic
        Example: "Vulfpeck's 1612 brings the chamber-folk minimalism 
                  you love from Ben Folds to string arrangements"
    """
    if use_fallback or not has_api_key():
        return generate_why_fallback(track, persona)
    
    prompt = f"""
You are a music discovery expert for {persona.name}, a {persona.top_genre} listener.
The listener's top artists are: {', '.join(persona.top_artists)}.

I'm recommending this track:
- Title: {track.title}
- Artist: {track.artist}
- Genre tags: {', '.join(track.genre_tags)}
- Vibe: energy={track.sound_descriptors['energy']}, 
  valence={track.sound_descriptors['valence']}, 
  tempo={track.sound_descriptors['tempo']} BPM

Generate ONE sentence (15–25 words) explaining why this track fits their taste.
Be specific about genre, mood, or artist lineage. Never generic.
Never mention "our algorithm" or "recommendations."

Sentence:
    """
    
    response = call_llm(prompt)
    return response.strip()

def generate_why_fallback(track: Track, persona: ListenerPersona) -> str:
    """
    Fallback: template + data (no API key required).
    """
    templates = [
        f"{track.title} brings {track.genre_tags[0]} depth deeper than {persona.top_artists[0]}.",
        f"If you love {persona.top_artists[0]}, this cut matches the {track.sound_descriptors['valence']} "
        f"and pace you've been gravitating toward.",
    ]
    return random.choice(templates)
```

**Genre-Adjacency Judgment**

```python
def judge_genre_adjacency(
    candidate_genre: str,
    user_genre: str,
    use_fallback: bool = False
) -> Tuple[bool, str]:
    """
    Determine if candidate_genre is "deep but on-topic" vs. "off-topic."
    
    Args:
        candidate_genre: Genre of the candidate track
        user_genre: User's locked genre
        use_fallback: Force fallback reasoning
    
    Returns:
        (is_adjacent: bool, reasoning: str)
        Example: (True, "Chamber folk shares tonal minimalism and 
                         vocal prominence with indie folk")
    """
    if use_fallback or not has_api_key():
        return judge_genre_adjacency_fallback(candidate_genre, user_genre)
    
    prompt = f"""
Are {candidate_genre!r} and {user_genre!r} close enough in sound and lineage 
that a deep cut in {candidate_genre} would appeal to a {user_genre} fan 
seeking discovery within their taste?

Respond with:
1. YES or NO
2. One sentence reasoning (15–20 words) about sonic overlap or genre heritage

Example:
YES
Chamber folk shares the introspective vocals and acoustic instrumentation 
of indie folk, just more minimalist.
    """
    
    response = call_llm(prompt)
    lines = response.strip().split('\n')
    is_adjacent = 'YES' in lines[0].upper()
    reasoning = lines[1] if len(lines) > 1 else ""
    
    return is_adjacent, reasoning

def judge_genre_adjacency_fallback(
    candidate_genre: str,
    user_genre: str
) -> Tuple[bool, str]:
    """
    Fallback: rule-based adjacency (no API key required).
    Hard-coded graph of genre neighbors.
    """
    adjacency_map = {
        'Indie Folk': ['Chamber Folk', 'Alt-Country', 'Singer-Songwriter'],
        'Ambient': ['Drone', 'Post-Rock', 'Minimalist Classical'],
        'Math Rock': ['Post-Hardcore', 'Prog-Rock', 'Experimental'],
    }
    
    neighbors = adjacency_map.get(user_genre, [])
    is_adjacent = candidate_genre in neighbors
    
    reasoning = (f"{candidate_genre} shares sonic roots with {user_genre}" 
                 if is_adjacent 
                 else f"{candidate_genre} diverges too far from {user_genre}")
    
    return is_adjacent, reasoning
```

#### 2.2 LLM Configuration (`llm/config.py`)

```python
import os
from typing import Optional

class LLMConfig:
    """Centralized LLM settings."""
    
    MODEL = os.getenv("LLM_MODEL", "gpt-4-turbo")
    API_KEY = os.getenv("OPENAI_API_KEY", None)
    TEMPERATURE = 0.7  # Creative but grounded
    MAX_TOKENS = 50  # Enforce brevity
    
    @classmethod
    def is_enabled(cls) -> bool:
        """Check if API is available."""
        return cls.API_KEY is not None and cls.API_KEY.strip() != ""

def has_api_key() -> bool:
    """Quick check for API key."""
    return LLMConfig.is_enabled()

def call_llm(prompt: str) -> str:
    """
    Unified LLM call.
    Raises ValueError if no API key configured.
    """
    if not has_api_key():
        raise ValueError("No LLM API key configured. Set OPENAI_API_KEY env var.")
    
    # OpenAI call (or Anthropic, etc.)
    import openai
    openai.api_key = LLMConfig.API_KEY
    
    response = openai.ChatCompletion.create(
        model=LLMConfig.MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=LLMConfig.TEMPERATURE,
        max_tokens=LLMConfig.MAX_TOKENS
    )
    
    return response['choices'][0]['message']['content']
```

#### 2.3 Testing LLM Module (`tests/test_llm.py`)

```python
def test_generate_why_fallback_works():
    """Fallback why-line works without API key."""
    
def test_generate_why_non_generic():
    """Why-line is specific (if API available)."""
    
def test_genre_adjacency_fallback():
    """Fallback adjacency judgment uses rule-based map."""
    
def test_genre_adjacency_consistency():
    """Same query returns same result."""
    
def test_why_line_length():
    """Generated why-line respects max length."""
    
def test_api_key_missing_graceful():
    """App still runs without API key (fallbacks used)."""
```

---

## Phase 3: UI & Integration (Days 5–6)

### Goals
- Build React frontend with Spotify design language
- Create FastAPI backend for engine-UI communication
- Implement responsive, dark-themed interface
- Integrate shared controls & feedback logging

### Components

#### 3.1 FastAPI Backend (`backend/api.py`)

**Core Endpoints**

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from engine.recommendation import get_recommendations
from llm.client import generate_why, judge_genre_adjacency

app = FastAPI(title="Discovery DJ API")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/recommend")
async def get_recs(
    persona_id: str,
    locked_genre: str,
    dial_position: float = 0.5,
    limit: int = 5
):
    """
    Get recommendations for a persona.
    Query params: persona_id, locked_genre, dial_position (0–1), limit
    """
    try:
        persona = get_persona_by_id(persona_id)
        excluded_ids = get_excluded_ids(persona_id)
        
        recs = get_recommendations(
            persona=persona,
            locked_genre=locked_genre,
            dial_position=dial_position,
            excluded_ids=excluded_ids,
            limit=limit
        )
        
        return {
            "tracks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "artist": t.artist,
                    "album_art_url": t.album_art_url,
                    "genre_tags": t.genre_tags,
                    "popularity_score": t.popularity_score,
                    "sound_descriptors": t.sound_descriptors,
                }
                for t in recs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/why-line")
async def generate_why_line(track_id: str, persona_id: str):
    """
    Generate AI-powered why-line for a track.
    Body: { track_id, persona_id }
    """
    try:
        track = get_track_by_id(track_id)
        persona = get_persona_by_id(persona_id)
        
        why_line = generate_why(track, persona)
        
        return {"why_line": why_line}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/feedback")
async def log_feedback(persona_id: str, track_id: str, action: str):
    """
    Log user action (SAVE, SKIP, REPLAY).
    Body: { persona_id, track_id, action }
    """
    try:
        save_feedback(
            persona_id=persona_id,
            track_id=track_id,
            action=action
        )
        return {"status": "logged"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/personas")
async def list_personas():
    """Get all available listener personas."""
    return {
        "personas": [
            {
                "id": p.id,
                "name": p.name,
                "top_genre": p.top_genre,
                "top_artists": p.top_artists,
            }
            for p in LISTENER_PERSONAS
        ]
    }

@app.get("/baseline")
async def get_baseline_autoplay(persona_id: str):
    """
    Get 'today's Autoplay' (genre-agnostic, random).
    For comparison in the UI.
    """
    try:
        baseline_track = random.choice(TRACK_LIBRARY)
        return {
            "track": {
                "id": baseline_track.id,
                "title": baseline_track.title,
                "artist": baseline_track.artist,
                "album_art_url": baseline_track.album_art_url,
                "genre_tags": baseline_track.genre_tags,
                "popularity_score": baseline_track.popularity_score,
            },
            "note": "No explanation (today's Spotify behavior)"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

#### 3.2 React Frontend Structure (`frontend/src/`)

**Component Tree**

```
src/
├── components/
│   ├── Sidebar.tsx           # Genre lock, dial, listener history
│   ├── HomeShelf.tsx         # Screen 1: 4–5 recommendations
│   ├── DiscoveryScreen.tsx   # Screen 2: Autoplay moment
│   ├── TrackCard.tsx         # Reusable track card (Spotify-style)
│   ├── BaselineToggle.tsx    # Show/hide baseline comparison
│   └── Header.tsx            # App header with branding
├── hooks/
│   ├── useRecommendations.ts # Fetch recs from API
│   ├── useWhyLine.ts         # Fetch why-line for track
│   └── useFeedback.ts        # Log user actions
├── store/
│   └── appStore.ts           # Zustand state (persona, genre lock, dial)
├── types/
│   └── index.ts              # TypeScript interfaces
├── styles/
│   └── globals.css           # Tailwind + custom Spotify theming
├── pages/
│   ├── App.tsx               # Main app container
│   └── index.tsx             # Entry point
└── api/
    └── client.ts             # Axios/fetch wrapper for backend
```

**Main App Component (`App.tsx`)**

```typescript
import { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import Sidebar from './components/Sidebar'
import HomeShelf from './components/HomeShelf'
import DiscoveryScreen from './components/DiscoveryScreen'
import Header from './components/Header'

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'discovery'>('home')
  const { personaId, genreLock, dialPosition } = useAppStore()

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />

        {/* Tab Navigation (Spotify-style) */}
        <div className="border-b border-gray-800 bg-gray-900">
          <div className="px-6 flex gap-6">
            <button
              onClick={() => setActiveTab('home')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'home'
                  ? 'border-green-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              🏠 Home Shelf
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`py-4 px-2 border-b-2 transition ${
                activeTab === 'discovery'
                  ? 'border-green-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              ▶️ Discovery
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'home' && <HomeShelf />}
          {activeTab === 'discovery' && <DiscoveryScreen />}
        </div>
      </main>
    </div>
  )
}
```

**TrackCard Component (Spotify-style)**

```typescript
// components/TrackCard.tsx
import { Track } from '../types'
import { useWhyLine } from '../hooks/useWhyLine'
import { useFeedback } from '../hooks/useFeedback'

interface TrackCardProps {
  track: Track
  personaId: string
}

export default function TrackCard({ track, personaId }: TrackCardProps) {
  const { whyLine, loading } = useWhyLine(track.id, personaId)
  const { logFeedback } = useFeedback()

  const handleSave = () => {
    logFeedback(personaId, track.id, 'SAVE')
  }

  const handleSkip = () => {
    logFeedback(personaId, track.id, 'SKIP')
  }

  return (
    <div className="group bg-gray-900 hover:bg-gray-800 rounded-lg p-4 cursor-pointer transition">
      {/* Album Art */}
      <div className="mb-4 overflow-hidden rounded">
        <img
          src={track.album_art_url}
          alt={track.title}
          className="w-full aspect-square object-cover group-hover:scale-105 transition"
        />
      </div>

      {/* Track Info */}
      <h3 className="font-bold text-white truncate">{track.title}</h3>
      <p className="text-sm text-gray-300 truncate mb-3">{track.artist}</p>

      {/* Why-line */}
      {whyLine && (
        <div className="bg-green-900 bg-opacity-20 border-l-2 border-green-500 pl-3 py-2 mb-3 rounded text-sm text-gray-100">
          💡 {whyLine}
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-400 mb-3">
        {track.genre_tags.join(' • ')} • Popularity: {track.popularity_score}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-2 rounded transition"
        >
          💾 Save
        </button>
        <button
          onClick={handleSkip}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition"
        >
          ⏭ Skip
        </button>
      </div>
    </div>
  )
}
```

**Sidebar Component**

```typescript
// components/Sidebar.tsx
import { useAppStore } from '../store/appStore'

export default function Sidebar() {
  const {
    personaId,
    setPersonaId,
    genreLock,
    setGenreLock,
    dialPosition,
    setDialPosition,
    personas,
  } = useAppStore()

  const popularityRange = 
    dialPosition < 0.33 ? '60–100 (Popular)'
    : dialPosition < 0.67 ? '40–60 (Mixed)'
    : '10–40 (Deep Cuts)'

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 p-6 overflow-y-auto">
      {/* Spotify Logo Area */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-green-500">🎵 DJ</h1>
        <p className="text-xs text-gray-400">Discover Deeper</p>
      </div>

      {/* Listener Profile */}
      <div className="mb-6">
        <label className="text-xs font-bold text-gray-400 uppercase">Profile</label>
        <select
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
          className="w-full mt-2 bg-gray-800 text-white rounded px-3 py-2 text-sm"
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Genre Lock */}
      <div className="mb-6">
        <label className="text-xs font-bold text-gray-400 uppercase">🔒 Genre Lock</label>
        <select
          value={genreLock}
          onChange={(e) => setGenreLock(e.target.value)}
          className="w-full mt-2 bg-gray-800 text-white rounded px-3 py-2 text-sm"
        >
          <option>Indie Folk</option>
          <option>Ambient</option>
          <option>Math Rock</option>
        </select>
      </div>

      {/* Safe ↔ Adventurous Dial */}
      <div className="mb-6">
        <label className="text-xs font-bold text-gray-400 uppercase">
          Safe ←→ Adventurous
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={dialPosition}
          onChange={(e) => setDialPosition(parseFloat(e.target.value))}
          className="w-full mt-3 accent-green-500"
        />
        <p className="text-xs text-gray-400 mt-2">{popularityRange}</p>
      </div>

      {/* Feedback History */}
      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Feedback</h3>
        <div className="space-y-2 text-xs">
          {/* Feedback list will be populated from store */}
          <p className="text-gray-500">No feedback yet</p>
        </div>
      </div>
    </aside>
  )
}
```

**HomeShelf Component**

```typescript
// components/HomeShelf.tsx
import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useRecommendations } from '../hooks/useRecommendations'
import TrackCard from './TrackCard'

export default function HomeShelf() {
  const { personaId, genreLock, dialPosition } = useAppStore()
  const { recs, loading, error } = useRecommendations(
    personaId,
    genreLock,
    dialPosition,
    5
  )

  if (loading) return <div className="text-gray-400">Loading recommendations...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>
  if (recs.length === 0) return <div className="text-gray-400">No recommendations available</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Discover in Your Genre</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recs.map((track) => (
          <TrackCard key={track.id} track={track} personaId={personaId} />
        ))}
      </div>
    </div>
  )
}
```

**DiscoveryScreen Component (Autoplay Moment)**

```typescript
// components/DiscoveryScreen.tsx
import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useRecommendations } from '../hooks/useRecommendations'
import { getBaselineAutoplay } from '../api/client'
import TrackCard from './TrackCard'

export default function DiscoveryScreen() {
  const { personaId, genreLock, dialPosition } = useAppStore()
  const { recs, loading } = useRecommendations(personaId, genreLock, dialPosition, 1)
  const [baseline, setBaseline] = useState(null)
  const [showBaseline, setShowBaseline] = useState(false)

  useEffect(() => {
    if (showBaseline) {
      getBaselineAutoplay(personaId).then(setBaseline)
    }
  }, [showBaseline])

  const nextTrack = recs[0]

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">▶️ Up Next</h2>

      {/* Main Recommendation */}
      {nextTrack && (
        <div className="bg-gray-900 rounded-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <img
              src={nextTrack.album_art_url}
              alt={nextTrack.title}
              className="rounded col-span-1 md:col-span-2"
            />
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-3xl font-bold mb-2">{nextTrack.title}</h3>
              <p className="text-xl text-gray-300 mb-6">{nextTrack.artist}</p>

              {/* Why-line will auto-load from TrackCard */}
              <div className="flex gap-3 mt-6">
                <button className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-full transition">
                  💾 Save to Library
                </button>
                <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-full transition">
                  ⏭ Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Baseline Comparison Toggle */}
      <div className="border-t border-gray-800 pt-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showBaseline}
            onChange={(e) => setShowBaseline(e.target.checked)}
            className="w-4 h-4 accent-green-500"
          />
          <span className="text-sm font-semibold">Show baseline (today's Spotify)</span>
        </label>

        {showBaseline && baseline && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h4 className="text-lg font-bold mb-4">📊 Baseline Autoplay (No Explanation)</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <img
                src={baseline.track.album_art_url}
                alt={baseline.track.title}
                className="rounded col-span-1 md:col-span-2"
              />
              <div className="col-span-1 md:col-span-2">
                <p className="text-xs text-gray-400 mb-2">Genre-agnostic • Random</p>
                <h5 className="text-lg font-bold">{baseline.track.title}</h5>
                <p className="text-gray-300">{baseline.track.artist}</p>
              </div>
            </div>

            {/* Comparison Insights */}
            <div className="mt-6 bg-green-900 bg-opacity-20 border-l-2 border-green-500 pl-4 py-3 rounded">
              <p className="text-sm font-semibold mb-2">✨ Why Discovery DJ is different:</p>
              <ul className="text-sm text-gray-200 space-y-1">
                <li>✓ Locked to {genreLock}</li>
                <li>✓ Personalized explanation</li>
                <li>✓ Your adventurousness level respected</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Phase 4: Testing & Refinement (Days 7)

### Goals
- Full test suite execution
- Manual QA and why-line quality review
- Documentation completion

### Components

#### 4.1 Comprehensive Test Suite (`tests/test_integration.py`)

```python
def test_end_to_end_home_shelf():
    """Full flow: persona → recs → why-lines."""
    
def test_genre_lock_enforced_at_all_dial_positions():
    """Genre lock holds across all dial positions."""
    
def test_popularity_distribution():
    """Safe dial returns high-popularity; Adventurous returns low."""
    
def test_novelty_filter_persistence():
    """Excluded tracks remain excluded across screens."""
    
def test_why_line_grounding():
    """Why-lines reference specific artist/mood/genre details."""
    
def test_fallback_without_api_key():
    """App runs fully functional without LLM API key."""
    
def test_genre_adjacency_edge_cases():
    """Adjacency judgment sensible for ambiguous genres."""
    
def test_performance():
    """Recommendation generation < 500ms."""
```

#### 4.2 Manual Quality Checklist

- [ ] Why-lines are specific (not generic templates)
- [ ] Why-lines pass "would a real fan agree?" test
- [ ] Genre-adjacency calls make sensible decisions
- [ ] UI loads without lag
- [ ] Baseline toggle provides clear comparison
- [ ] Feedback log is accurate and readable

---

## File Structure

```
discovery-dj/
├── backend/                           # Python FastAPI + Engine
│   ├── api.py                         # FastAPI routes & endpoints
│   ├── data/
│   │   ├── models.py                  # Track, Persona, UserAction dataclasses
│   │   └── mock_library.py            # Track library & listener personas
│   ├── engine/
│   │   ├── recommendation.py          # Core recommendation pipeline
│   │   └── novelty_manager.py         # Excluded track state
│   ├── llm/
│   │   ├── client.py                  # LLM calls (why-line, adjacency)
│   │   ├── config.py                  # API key, model config
│   │   └── fallbacks.py               # Template-based fallbacks
│   ├── tests/
│   │   ├── test_engine.py             # Recommendation logic tests
│   │   ├── test_llm.py                # LLM module tests
│   │   ├── test_integration.py        # End-to-end tests
│   │   └── fixtures.py                # Reusable test data
│   ├── requirements.txt               # Python dependencies
│   ├── .env.example                   # Sample env vars
│   └── Dockerfile                     # Backend container
│
├── frontend/                          # React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx            # Genre lock, dial, history
│   │   │   ├── HomeShelf.tsx          # Screen 1
│   │   │   ├── DiscoveryScreen.tsx    # Screen 2 (Autoplay moment)
│   │   │   ├── TrackCard.tsx          # Spotify-style track card
│   │   │   ├── BaselineToggle.tsx     # Comparison toggle
│   │   │   └── Header.tsx             # App header
│   │   ├── hooks/
│   │   │   ├── useRecommendations.ts  # Fetch recs from API
│   │   │   ├── useWhyLine.ts          # Fetch why-line
│   │   │   └── useFeedback.ts         # Log user actions
│   │   ├── store/
│   │   │   └── appStore.ts            # Zustand state management
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript interfaces
│   │   ├── api/
│   │   │   └── client.ts              # Fetch/axios wrapper
│   │   ├── styles/
│   │   │   └── globals.css            # Tailwind + Spotify theme
│   │   ├── pages/
│   │   │   ├── App.tsx                # Main app
│   │   │   └── index.tsx              # Entry point
│   │   └── main.tsx                   # Vite entry
│   ├── package.json                   # Node dependencies
│   ├── tsconfig.json                  # TypeScript config
│   ├── tailwind.config.js             # Tailwind + dark mode
│   ├── vite.config.ts                 # Vite config
│   └── Dockerfile                     # Frontend container
│
├── docs/
│   ├── ProblemStatement_Refined.md
│   ├── PhaseWiseArchitecture.md
│   ├── API.md                         # FastAPI endpoints
│   └── TESTING.md                     # Test documentation
│
├── docker-compose.yml                 # Orchestrate backend + frontend
├── README.md                          # Project overview
└── .gitignore
```

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React.js + TypeScript | Spotify-like UI, component reusability, state management (Zustand) |
| **Styling** | Tailwind CSS | Rapid design, dark-mode, Spotify green (#1DB954) accents |
| **Backend API** | Python FastAPI | RESTful endpoints, async, type-safe, minimal setup |
| **Backend Logic** | Python 3.10+ | Core engine, deterministic, testable |
| **LLM** | OpenAI GPT-4 (fallback: templates) | Quality reasoning, fallback-friendly |
| **Testing** | pytest (backend) + Vitest (frontend) | Comprehensive coverage |
| **Build** | Vite (frontend) + Docker (backend) | Fast dev experience, reproducible environment |

---

## Key Design Decisions

1. **React Frontend + FastAPI Backend** — Separates concerns: frontend is decoupled from backend logic, allowing easy redesign/restyling without touching recommendation engine

2. **Spotify Design Language** — Dark theme (#111111), green accents (#1DB954), card-based layouts, familiar controls. Users feel "at home"

3. **Zustand State Management** — Minimal, fast global state (persona, genre lock, dial). No Redux boilerplate for a small feature set

4. **Fallback First** — All LLM calls have non-API-key fallbacks. App is fully usable without setup

5. **No UI Logic in Engine** — Recommendation module has zero React/frontend dependencies. Testable in isolation, reusable in any UI

6. **Mock Data for MVP** — Sidesteps Spotify API limitations, focuses on core logic. Easily swappable with real data later

7. **Explicit AI Boundary** — Inline comments and README clearly state which functions are AI, which are deterministic rules

8. **Genre Lock as First-Class Control** — Central to all UI, not a post-hoc filter

9. **Popularity Ceiling Over Collaborative Filtering** — Simple, interpretable, deterministic. Matches MVP scope

10. **Docker for Reproducibility** — Both backend and frontend run in containers. `docker-compose up` = full local dev environment

---

## Success Metrics (Post-Build)

- ✅ Save rate on recommendations ≥ 65% (vs. 45% baseline)
- ✅ All why-lines are grounded & specific (manual review)
- ✅ Genre-adjacency judgments pass peer review on edge cases
- ✅ App loads Home Shelf in < 500ms
- ✅ Test coverage ≥ 85% on core engine
- ✅ AI/deterministic boundary clearly documented
- ✅ Fallback mode (no API key) fully functional

