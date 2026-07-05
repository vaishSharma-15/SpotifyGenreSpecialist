import { useEffect, useState } from 'react'
import type { Genre, Mood } from './types'
import { api } from './api'
import { useStore } from './store'
import TopBar from './components/TopBar'
import FilterTabs from './components/FilterTabs'
import LibraryPanel from './components/LibraryPanel'
import Home from './components/Home'
import Discovery from './components/Discovery'
import Library from './components/Library'
import NowPlaying from './components/NowPlaying'
import PlayerBar from './components/PlayerBar'
import MobileMiniPlayer from './components/MobileMiniPlayer'
import MobileNav from './components/MobileNav'
import MobilePlayer from './components/MobilePlayer'
import DeviceToggle from './components/DeviceToggle'
import PhoneFrame from './components/PhoneFrame'

const isEmbedded = new URLSearchParams(window.location.search).get('embed') === '1'

export default function App() {
  const deviceOverride = useStore((s) => s.deviceOverride)

  // Mobile preview: an inline iframe of the same app, same URL, same page —
  // no navigation, no separate mockup page. This is the only way to get
  // pixel-accurate mobile rendering while sitting in a desktop-wide browser
  // window, since CSS breakpoints respond to the real viewport, not JS state.
  // Wrapped in real iPhone chrome (status bar, notch, home indicator) purely
  // for visual polish — the iframe inside is the actual live app.
  if (!isEmbedded && deviceOverride === 'mobile') {
    return (
      <div className="h-full flex flex-col bg-black">
        <DeviceToggle />
        <div className="flex-1 grid place-items-center overflow-auto bg-[#0b0b0b] p-4">
          <PhoneFrame src={`${import.meta.env.BASE_URL}?embed=1`} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {!isEmbedded && <DeviceToggle />}
      <MainApp />
    </div>
  )
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
    <div className="flex-1 flex flex-col min-h-0">
      <TopBar />

      {/* Middle: 3-pane on desktop, single column on mobile */}
      <div className="flex-1 flex gap-2 px-2 min-h-0">
        <div className="hidden md:block w-[280px] shrink-0">
          <LibraryPanel />
        </div>

        <main className="flex-1 min-w-0 overflow-y-auto rounded-lg bg-gradient-to-b from-[#1f1f1f] to-spotify-base">
          {view === 'home' && <FilterTabs />}
          <div className={`px-4 sm:px-6 pb-6 ${view !== 'home' ? 'pt-4 sm:pt-6' : ''}`}>
            {view === 'home' ? (
              <Home genres={genres} />
            ) : view === 'discovery' ? (
              <Discovery genres={genres} moods={moods} />
            ) : (
              <Library />
            )}
          </div>
        </main>

        <NowPlaying />
      </div>

      <PlayerBar />
      <MobileMiniPlayer />
      <MobileNav />
      <MobilePlayer />
    </div>
  )
}
