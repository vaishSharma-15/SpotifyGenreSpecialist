import { useEffect, useRef, useState } from 'react'
import type { Genre, Mood, Track } from '../types'
import { api } from '../api'
import { useStore } from '../store'
import TrackCard from './TrackCard'

interface Props {
  genres: Genre[]
  moods: Mood[]
}

/** Discovery: choose a genre + mood, try something new, save the mix. */
export default function Discovery({ genres, moods }: Props) {
  const { genre, mood, dial, served, personaId, setGenre, setMood, setDial, addServed, setQueue,
          saveMix, savedMixes } = useStore()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [exhausted, setExhausted] = useState(false)

  // The dial redraws instantly while dragging; the actual reload (network call)
  // is debounced so a smooth drag doesn't fire a fetch on every tick.
  const [localDial, setLocalDial] = useState(dial)
  const dialTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => setLocalDial(dial), [dial])
  useEffect(() => () => { if (dialTimeout.current) clearTimeout(dialTimeout.current) }, [])
  const onDialChange = (v: number) => {
    setLocalDial(v)
    if (dialTimeout.current) clearTimeout(dialTimeout.current)
    dialTimeout.current = setTimeout(() => setDial(v), 250)
  }

  const load = async (append = false) => {
    if (!personaId || !genre) return
    setLoading(true)
    try {
      const { tracks: recs, exhausted: done } = await api.recommend(
        personaId, genre, dial, 12, append ? served : [], mood,
      )
      setExhausted(done)
      addServed(recs.map((t) => t.id))
      setTracks((prev) => {
        if (!append) { setQueue(recs); return recs }
        const seen = new Set(prev.map((t) => t.id))
        const merged = [...prev, ...recs.filter((t) => !seen.has(t.id))]
        setQueue(merged)
        return merged
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Don't clear the grid first — keep the previous results visible until the
    // new ones arrive, so the page doesn't collapse/reflow mid-drag on the dial.
    load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, mood, dial])

  const dialLabel = localDial < 0.34 ? 'Safe' : localDial < 0.67 ? 'Balanced' : 'Adventurous'
  const mixSaved = savedMixes.some((m) => m.genre === genre && m.mood === mood)

  const pitch = () => {
    if (!genre) return 'Pick a genre below and our AI DJ starts digging.'
    if (mood) return `Craving something ${mood.toLowerCase()} in ${genre}? We're brewing your mix now.`
    return `Locked in on ${genre} — add a mood to sharpen the vibe, or just hit shuffle on what we found.`
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-spotify-green/15 text-spotify-green text-xs font-bold uppercase tracking-wide mb-2">
          ✨ AI Discovery
        </span>
        <h1 className="text-3xl font-extrabold text-white">Find your next favorite song</h1>
        <p className="text-spotify-subtle mt-1">
          Meaningful discovery, not repetitive listening. Choose a genre and a mood, and go deeper
          into your own taste not just more of the same.
        </p>
        <p className="text-spotify-subtle mt-1">{pitch()}</p>
      </div>

      {/* Genre chips */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-spotify-subtle mb-2">Genre</p>
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <Chip key={g.id} active={genre === g.name} onClick={() => setGenre(g.name)}>
              {g.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Mood chips */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-spotify-subtle mb-2">Mood</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={mood === ''} onClick={() => setMood('')}>Any</Chip>
          {moods.map((m) => (
            <Chip key={m.id} active={mood === m.name} onClick={() => setMood(m.name)}>
              {m.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Dial + save mix */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px] max-w-sm">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-spotify-subtle mb-1">
            <span>Safe</span><span className="text-spotify-green">{dialLabel}</span><span>Bold</span>
          </div>
          <input
            type="range" min={0} max={1} step={0.05} value={localDial}
            onChange={(e) => onDialChange(parseFloat(e.target.value))}
            style={{ ['--pct' as string]: `${localDial * 100}%` }}
            className="w-full"
          />
        </div>
        <button
          onClick={saveMix}
          disabled={mixSaved}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            mixSaved
              ? 'bg-spotify-highlight text-spotify-subtle cursor-default'
              : 'bg-spotify-green text-black hover:bg-spotify-greenHover hover:scale-105'
          }`}
        >
          {mixSaved ? '✓ Mix saved' : '+ Save this mix'}
        </button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tracks.map((t) => (
          <TrackCard
            key={t.id} track={t}
            onSkip={(id) => setTracks((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>

      {loading && <p className="text-spotify-subtle">✨ Curating your mix…</p>}
      {!loading && tracks.length > 0 && (
        <div className="flex justify-center">
          {exhausted ? (
            <p className="text-spotify-subtle text-sm">🎉 You’ve explored this whole crate. Try a bolder dial or new mood.</p>
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
      {!loading && tracks.length === 0 && (
        <p className="text-spotify-subtle">No tracks matched. Try a different genre or mood.</p>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
        active ? 'bg-white text-black' : 'bg-spotify-elevated text-white hover:bg-spotify-highlight'
      }`}
    >
      {children}
    </button>
  )
}
