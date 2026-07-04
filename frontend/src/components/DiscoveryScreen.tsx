import { useEffect, useState } from 'react'
import type { Track } from '../types'
import { api } from '../api'
import { useStore } from '../store'

export default function DiscoveryScreen() {
  const { personaId, genre, mood, dial, served, addServed, addFeedback, playTrack, setQueue,
          currentWhy, whyLoading } = useStore()
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBaseline, setShowBaseline] = useState(false)
  const [baseline, setBaseline] = useState<Track | null>(null)
  const why = whyLoading ? 'Thinking…' : currentWhy

  const next = async () => {
    if (!personaId || !genre) return
    setLoading(true)
    try {
      const { tracks } = await api.recommend(personaId, genre, dial, 1, served, mood)
      const t = tracks[0] ?? null
      setTrack(t)
      if (t) {
        addServed([t.id])
        setQueue([t])
        playTrack(t) // plays audio + loads the why into the store
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId, genre, mood, dial])

  useEffect(() => {
    if (showBaseline && personaId && genre) {
      api.baseline(personaId, genre).then((r) => setBaseline(r.track)).catch(() => {})
    }
  }, [showBaseline, personaId, genre])

  const act = (action: 'SAVE' | 'SKIP') => {
    if (!track) return
    addFeedback(track.id, action)
    api.feedback(personaId, track.id, action).catch(() => {})
    next()
  }

  if (loading && !track) return <p className="text-spotify-subtle">Cueing up your next discovery…</p>
  if (!track) return <p className="text-spotify-subtle">No more tracks in this genre — try a bolder dial.</p>

  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-xs uppercase tracking-widest text-spotify-subtle mb-2">Up Next · Autoplay</p>

      <div className="flex flex-col md:flex-row gap-8 items-center bg-gradient-to-b from-spotify-highlight to-spotify-base rounded-xl p-8">
        <img
          src={track.album_art_url}
          alt={track.title}
          className="w-56 h-56 rounded-lg object-cover shadow-2xl"
        />
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-white mb-2">{track.title}</h1>
          <p className="text-xl text-spotify-subtle mb-4">{track.artist}</p>
          <div className="border-l-2 border-spotify-green pl-4 py-1 mb-6 text-left">
            <p className="text-spotify-green text-sm">{why || '…'}</p>
          </div>
          <div className="flex gap-3 justify-center md:justify-start">
            <button
              onClick={() => act('SAVE')}
              className="px-6 py-3 rounded-full bg-spotify-green text-black font-bold hover:bg-spotify-greenHover hover:scale-105 transition"
            >
              ♥ Save
            </button>
            <button
              onClick={() => act('SKIP')}
              className="px-6 py-3 rounded-full border border-spotify-subtle/40 text-white font-bold hover:border-white hover:scale-105 transition"
            >
              Skip ▷▷
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <label className="flex items-center gap-3 cursor-pointer text-sm text-spotify-subtle">
          <input
            type="checkbox"
            checked={showBaseline}
            onChange={(e) => setShowBaseline(e.target.checked)}
            className="accent-spotify-green w-4 h-4"
          />
          Compare with today’s Spotify Autoplay (no explanation)
        </label>

        {showBaseline && baseline && (
          <div className="mt-4 flex items-center gap-4 bg-spotify-elevated rounded-lg p-4">
            <img src={baseline.album_art_url} alt="" className="w-16 h-16 rounded object-cover" />
            <div>
              <p className="text-xs text-spotify-subtle">Random · genre-agnostic</p>
              <p className="text-white font-bold">{baseline.title}</p>
              <p className="text-spotify-subtle text-sm">{baseline.artist}</p>
            </div>
            <p className="ml-auto text-xs text-spotify-subtle/70 max-w-[12rem]">
              No “why”. Discovery DJ locks your genre and explains every pick.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
