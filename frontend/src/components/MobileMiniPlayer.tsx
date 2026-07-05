import { useStore } from '../store'

/** Real-Spotify-style mobile mini player: thin bar, small art, play/pause only.
 * The actual <audio> element lives in PlayerBar (kept mounted, just visually
 * hidden on mobile) — this is a lightweight view onto the same store state. */
export default function MobileMiniPlayer() {
  const { nowPlaying, isPlaying, togglePlay, progress, duration, showMobilePlayer, setShowMobilePlayer } =
    useStore()

  if (!nowPlaying || showMobilePlayer) return null
  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <button
      onClick={() => setShowMobilePlayer(true)}
      className="md:hidden flex flex-col w-full bg-[#2a2a2a] text-white text-left shrink-0"
    >
      <div className="h-[2px] w-full bg-white/10">
        <div className="h-full bg-spotify-green" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <img src={nowPlaying.album_art_url} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{nowPlaying.title}</p>
          <p className="text-xs text-spotify-subtle truncate">{nowPlaying.artist}</p>
        </div>
        <span
          role="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
          className="w-8 h-8 grid place-items-center shrink-0"
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </span>
      </div>
    </button>
  )
}
