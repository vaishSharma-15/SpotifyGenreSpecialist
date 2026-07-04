import { useEffect, useState } from 'react'
import type { Genre, Persona } from './types'
import { api } from './api'
import { useStore } from './store'
import Sidebar from './components/Sidebar'
import HomeShelf from './components/HomeShelf'
import DiscoveryScreen from './components/DiscoveryScreen'
import PlayerBar from './components/PlayerBar'

export default function App() {
  const { view, personaId, setPersona, setGenre } = useStore()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.personas(), api.genres()])
      .then(([ps, gs]) => {
        setPersonas(ps)
        setGenres(gs)
        if (ps[0]) setPersona(ps[0].id)
        if (gs[0]) setGenre(gs[0].name)
      })
      .catch((e) => setError((e as Error).message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error)
    return (
      <div className="h-full grid place-items-center p-8 text-center">
        <div>
          <p className="text-white text-lg font-bold mb-2">Can’t reach the backend</p>
          <p className="text-spotify-subtle text-sm mb-1">{error}</p>
          <p className="text-spotify-subtle/60 text-xs">
            Check that the API is running and VITE_API_URL points to it.
          </p>
        </div>
      </div>
    )

  if (!personaId) return <div className="h-full grid place-items-center text-spotify-subtle">Loading…</div>

  return (
    <div className="h-full flex flex-col bg-black p-2 gap-2">
      <div className="flex-1 flex gap-2 min-h-0">
        <Sidebar personas={personas} genres={genres} />
        <main className="flex-1 overflow-y-auto rounded-lg bg-gradient-to-b from-spotify-highlight/40 to-spotify-base p-6">
          {view === 'home' ? <HomeShelf /> : <DiscoveryScreen />}
        </main>
      </div>
      <PlayerBar />
    </div>
  )
}
