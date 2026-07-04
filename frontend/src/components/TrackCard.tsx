import { useState } from 'react'
import type { Track } from '../types'
import { api } from '../api'
import { useStore } from '../store'

interface Props {
  track: Track
}

export default function TrackCard({ track }: Props) {
  const { personaId, setNowPlaying, addFeedback } = useStore()
  const [why, setWhy] = useState<string | null>(null)
  const [loadingWhy, setLoadingWhy] = useState(false)

  const loadWhy = async () => {
    if (why || loadingWhy) return
    setLoadingWhy(true)
    try {
      setWhy(await api.whyLine(track.id, personaId))
    } catch {
      setWhy('A deep cut picked for your taste.')
    } finally {
      setLoadingWhy(false)
    }
  }

  const act = (action: 'SAVE' | 'SKIP') => {
    addFeedback(track.id, action)
    api.feedback(personaId, track.id, action).catch(() => {})
  }

  const play = () => {
    setNowPlaying(track)
    loadWhy()
  }

  return (
    <div
      onMouseEnter={loadWhy}
      className="group relative bg-spotify-elevated hover:bg-spotify-highlight rounded-lg p-4 transition-colors duration-300 cursor-pointer"
    >
      <div className="relative mb-4">
        <img
          src={track.album_art_url}
          alt={track.title}
          className="w-full aspect-square object-cover rounded-md shadow-lg"
          loading="lazy"
        />
        <button
          onClick={play}
          aria-label="Play"
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-spotify-green text-black text-xl grid place-items-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition shadow-xl hover:scale-105"
        >
          ▶
        </button>
      </div>

      <h3 className="text-white font-bold truncate">{track.title}</h3>
      <p className="text-sm text-spotify-subtle truncate">{track.artist}</p>

      <div className="mt-2 min-h-[2.5rem] text-xs text-spotify-green/90 leading-snug">
        {loadingWhy ? '…' : why ?? ''}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => act('SAVE')}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-spotify-green text-black hover:bg-spotify-greenHover transition"
        >
          ♥ Save
        </button>
        <button
          onClick={() => act('SKIP')}
          className="text-xs font-bold px-3 py-1.5 rounded-full border border-spotify-subtle/40 text-white hover:border-white transition"
        >
          Skip
        </button>
        <span className="ml-auto text-[10px] text-spotify-subtle/60">
          pop {Math.round(track.popularity_score)}
        </span>
      </div>
    </div>
  )
}
