import type { Track } from '../types'
import { api } from '../api'
import { useStore } from '../store'

interface Props {
  track: Track
  onSkip?: (trackId: string) => void
}

export function Heart({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-6.7-4.35-9.33-8.02C.9 10.3 1.5 6.9 4.2 5.6c1.9-.9 4.1-.3 5.3 1.3l.5.7.5-.7c1.2-1.6 3.4-2.2 5.3-1.3 2.7 1.3 3.3 4.7 1.53 7.38C18.7 16.65 12 21 12 21z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20s-6-4-8.4-7.2C1.9 10.6 2.4 7.6 4.7 6.5c1.7-.8 3.7-.3 4.8 1.2l.5.7.5-.7c1.1-1.5 3.1-2 4.8-1.2 2.3 1.1 2.8 4.1 1.1 6.3C18 16 12 20 12 20z" />
    </svg>
  )
}

export default function TrackCard({ track, onSkip }: Props) {
  const { personaId, nowPlaying, isPlaying, playTrack, togglePlay, addFeedback, toggleLike,
          likedTracks, next } = useStore()
  const isCurrent = nowPlaying?.id === track.id
  const liked = likedTracks.some((t) => t.id === track.id)

  const like = () => {
    const willLike = !liked
    toggleLike(track)
    addFeedback(track, willLike ? 'SAVE' : 'SKIP')
    api.feedback(personaId, track.id, willLike ? 'SAVE' : 'SKIP').catch(() => {})
  }

  const skip = () => {
    addFeedback(track, 'SKIP')
    api.feedback(personaId, track.id, 'SKIP').catch(() => {})
    if (isCurrent) next()
    onSkip?.(track.id)
  }

  const play = () => {
    if (isCurrent) togglePlay()
    else playTrack(track)
  }

  return (
    <div
      className="group relative min-w-0 bg-spotify-elevated hover:bg-spotify-highlight rounded-lg p-4 transition-colors duration-300 cursor-pointer"
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={like}
          aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition shrink-0 ${
            liked
              ? 'bg-spotify-green text-black'
              : 'border border-spotify-subtle/40 text-white hover:border-white'
          }`}
        >
          <Heart filled={liked} />
          {liked ? 'Liked' : 'Save'}
        </button>
        <button
          onClick={skip}
          className="text-xs font-bold px-3 py-1.5 rounded-full border border-spotify-subtle/40 text-white hover:border-white transition shrink-0"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
