import { useEffect, useState } from 'react'
import type { Track } from '../types'
import { api } from '../api'
import { useStore } from '../store'
import TrackCard from './TrackCard'

export default function HomeShelf() {
  const { personaId, genre, mood, dial, served, addServed, setQueue } = useStore()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [exhausted, setExhausted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (append = false) => {
    if (!personaId || !genre) return
    setLoading(true)
    setError(null)
    try {
      const excl = append ? served : []
      const { tracks: recs, exhausted: done } = await api.recommend(
        personaId,
        genre,
        dial,
        8,
        excl,
        mood,
      )
      setExhausted(done)
      addServed(recs.map((t) => t.id))
      setTracks((prev) => {
        if (!append) { setQueue(recs); return recs }
        const seen = new Set(prev.map((t) => t.id))
        const merged = [...prev, ...recs.filter((t) => !seen.has(t.id))]
        setQueue(merged) // keep the player queue in sync for next/prev
        return merged
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Reload from scratch when the session parameters change.
  useEffect(() => {
    setTracks([])
    load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId, genre, mood, dial])

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-white mb-1">{greeting}</h1>
      <p className="text-spotify-subtle mb-6">
        Deep cuts in <span className="text-white font-semibold">{genre}</span>
        {mood && <> · <span className="text-spotify-green font-semibold">{mood}</span> mood</>} — picked for your taste.
      </p>

      {error && <p className="text-red-400 mb-4">Couldn’t reach the backend: {error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} />
        ))}
      </div>

      {loading && <p className="text-spotify-subtle mt-6">Loading…</p>}

      {!loading && tracks.length > 0 && (
        <div className="flex justify-center mt-8">
          {exhausted ? (
            <p className="text-spotify-subtle text-sm">
              🎉 You’ve explored the whole {genre} crate. Try a bolder dial or another genre.
            </p>
          ) : (
            <button
              onClick={() => load(true)}
              className="px-6 py-2 rounded-full border border-spotify-subtle/40 text-white font-bold text-sm hover:border-white hover:scale-105 transition"
            >
              Load more
            </button>
          )}
        </div>
      )}

      {!loading && !error && tracks.length === 0 && (
        <p className="text-spotify-subtle">No tracks matched. Try a different genre or dial.</p>
      )}
    </div>
  )
}
