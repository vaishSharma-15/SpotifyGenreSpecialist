import { useEffect, useState } from 'react'
import type { Genre, Track } from '../types'
import { api } from '../api'
import { useStore } from '../store'
import TrackCard from './TrackCard'

interface Props {
  genres: Genre[]
}

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** Personalized Home: your Liked Songs + AI picks tuned to your taste. No controls. */
export default function Home({ genres }: Props) {
  const { likedTracks, savedMixes, personaId, dial, setQueue, applyMix } = useStore()
  const [recs, setRecs] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  // Home genre = your most-liked genre, else the first curated genre.
  const homeGenre = likedTracks[0]?.genre_tags[0] ?? genres[0]?.name ?? 'Pop'

  useEffect(() => {
    if (!personaId || !homeGenre) return
    setLoading(true)
    const exclude = likedTracks.map((t) => t.id)
    api
      .recommend(personaId, homeGenre, dial, 10, exclude)
      .then(({ tracks }) => {
        setRecs(tracks)
        setQueue([...likedTracks, ...tracks])
      })
      .catch(() => setRecs([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId, homeGenre, likedTracks.length])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold text-white">{greeting()}</h1>
        <p className="text-spotify-subtle mt-1">
          {likedTracks.length
            ? <>Based on your <span className="text-white font-semibold">{likedTracks.length}</span> liked {likedTracks.length === 1 ? 'song' : 'songs'} — more you’ll love.</>
            : <>Save a few songs and this fills with picks made for you. Starting with <span className="text-white font-semibold">{homeGenre}</span>.</>}
        </p>
      </div>

      {/* Liked Songs */}
      {likedTracks.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Liked Songs</h2>
            <span className="text-xs text-spotify-subtle">{likedTracks.length} saved</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {likedTracks.slice(0, 10).map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        </section>
      )}

      {/* Saved mixes */}
      {savedMixes.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Your saved mixes</h2>
          <div className="flex flex-wrap gap-2">
            {savedMixes.map((m, i) => (
              <button
                key={i}
                onClick={() => applyMix(m.genre, m.mood)}
                className="px-4 py-2 rounded-full bg-spotify-elevated hover:bg-spotify-highlight text-sm font-semibold transition"
              >
                {m.genre}{m.mood ? ` · ${m.mood}` : ''}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recommended */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-1">Recommended for today</h2>
        <p className="text-spotify-subtle text-sm mb-4">
          Fresh {homeGenre} picks — press play to hear why each one fits you.
        </p>
        {loading ? (
          <p className="text-spotify-subtle">Curating…</p>
        ) : recs.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recs.map((t) => (
              <TrackCard
                key={t.id} track={t}
                onSkip={(id) => setRecs((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        ) : (
          <p className="text-spotify-subtle">Couldn’t load picks — try Discovery to explore a genre.</p>
        )}
      </section>
    </div>
  )
}
