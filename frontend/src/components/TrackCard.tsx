import type { Track } from '../types'
import { api } from '../api'
import { useStore } from '../store'

interface Props {
  track: Track
}

export default function TrackCard({ track }: Props) {
  const { personaId, nowPlaying, isPlaying, playTrack, togglePlay, addFeedback } = useStore()
  const isCurrent = nowPlaying?.id === track.id

  const act = (action: 'SAVE' | 'SKIP') => {
    addFeedback(track.id, action)
    api.feedback(personaId, track.id, action).catch(() => {})
  }

  const play = () => {
    if (isCurrent) togglePlay()
    else playTrack(track)
  }

  return (
    <div
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
          aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
          className={`absolute bottom-2 right-2 w-12 h-12 rounded-full bg-spotify-green text-black grid place-items-center transition shadow-xl hover:scale-105 ${
            isCurrent
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrent && isPlaying ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
      </div>

      <h3 className={`font-bold truncate ${isCurrent ? 'text-spotify-green' : 'text-white'}`}>
        {track.title}
      </h3>
      <p className="text-sm text-spotify-subtle truncate">{track.artist}</p>

      <div className="mt-1 flex flex-wrap gap-1">
        {track.genre_tags[0] && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-spotify-subtle">
            {track.genre_tags[0]}
          </span>
        )}
        {track.mood && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-spotify-green/15 text-spotify-green">
            {track.mood}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
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
