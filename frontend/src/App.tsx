import { useEffect, useState } from 'react'
import type { Genre, Mood } from './types'
import { api } from './api'
import { useStore } from './store'
import TopBar from './components/TopBar'
import LibraryPanel from './components/LibraryPanel'
import HomeShelf from './components/HomeShelf'
import DiscoveryScreen from './components/DiscoveryScreen'
import NowPlaying from './components/NowPlaying'
import PlayerBar from './components/PlayerBar'
import MobileNav from './components/MobileNav'
import MobilePlayer from './components/MobilePlayer'
import PreviewShell from './components/PreviewShell'

export default function App() {
  // Mentor device-preview mode: /?preview=1 frames the app as desktop or phone.
  if (new URLSearchParams(window.location.search).get('preview') === '1') {
    return <PreviewShell />
  }
  return <MainApp />
}

function MainApp() {
  const { view, personaId, setPersona, setGenre } = useStore()
  const [genres, setGenres] = useState<Genre[]>([])
  const [moods, setMoods] = useState<Mood[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Personas still drive novelty/feedback server-side; we just default to the
    // first one (no Profile UI — ranking is genre + mood driven now).
    Promise.all([api.personas(), api.genres(), api.moods()])
      .then(([ps, gs, ms]) => {
        setGenres(gs)
        setMoods(ms)
        if (ps[0]) setPersona(ps[0].id)
        if (gs[0]) setGenre(gs[0].name)
      })
      .catch((e) => setError((e as Error).message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error)
    return (
      <div className="h-full grid place-items-center p-8 text-center bg-black">
        <div>
          <p className="text-white text-lg font-bold mb-2">Can’t reach the backend</p>
          <p className="text-spotify-subtle text-sm mb-1">{error}</p>
          <p className="text-spotify-subtle/60 text-xs">
            Check that the API is running and VITE_API_URL points to it.
          </p>
        </div>
      </div>
    )

  if (!personaId)
    return <div className="h-full grid place-items-center text-spotify-subtle bg-black">Loading…</div>

  return (
    <div className="h-full flex flex-col bg-black">
      <TopBar />

      {/* Middle: 3-pane on desktop, single column on mobile */}
      <div className="flex-1 flex gap-2 px-2 min-h-0">
        <div className="hidden md:block w-[280px] shrink-0">
          <LibraryPanel genres={genres} moods={moods} />
        </div>

        <main className="flex-1 min-w-0 overflow-y-auto rounded-lg bg-gradient-to-b from-[#1f1f1f] to-spotify-base">
          <div className="p-4 sm:p-6">
            {view === 'home' ? <HomeShelf /> : <DiscoveryScreen />}
          </div>
        </main>

        <NowPlaying />
      </div>

      {/* Mobile controls bar (genre/mood) under the header */}
      <MobileControls genres={genres} moods={moods} />

      <PlayerBar />
      <MobileNav />
      <MobilePlayer />
    </div>
  )
}

/** Compact controls row shown only on mobile (desktop uses the LibraryPanel). */
function MobileControls({ genres, moods }: { genres: Genre[]; moods: Mood[] }) {
  const { genre, mood, setGenre, setMood } = useStore()
  return (
    <div className="md:hidden flex gap-2 px-3 py-2 overflow-x-auto bg-black">
      <select value={genre} onChange={(e) => setGenre(e.target.value)}
        className="bg-spotify-highlight text-white rounded-full px-3 py-1.5 text-xs shrink-0">
        {genres.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
      </select>
      <select value={mood} onChange={(e) => setMood(e.target.value)}
        className="bg-spotify-highlight text-white rounded-full px-3 py-1.5 text-xs shrink-0">
        <option value="">Any mood</option>
        {moods.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
      </select>
    </div>
  )
}
