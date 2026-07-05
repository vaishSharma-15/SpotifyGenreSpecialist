import { api } from '../api'
import { useStore } from '../store'

/** Full-screen mobile "now playing" with the Why explanation (Spotify-style). */
export default function MobilePlayer() {
  const {
    nowPlaying,
    isPlaying,
    currentWhy,
    whyLoading,
    togglePlay,
    next,
    prev,
    showMobilePlayer,
    setShowMobilePlayer,
    addFeedback,
    toggleLike,
    likedTracks,
    personaId,
  } = useStore()

  if (!showMobilePlayer || !nowPlaying) return null
  const liked = likedTracks.some((t) => t.id === nowPlaying.id)

  const like = () => {
    const willLike = !liked
    toggleLike(nowPlaying)
    addFeedback(nowPlaying, willLike ? 'SAVE' : 'SKIP')
    api.feedback(personaId, nowPlaying.id, willLike ? 'SAVE' : 'SKIP').catch(() => {})
  }
  const skip = () => {
    addFeedback(nowPlaying, 'SKIP')
    api.feedback(personaId, nowPlaying.id, 'SKIP').catch(() => {})
    next()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-b from-[#3a3a3a] to-black p-6 lg:hidden"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between text-white mb-4 shrink-0">
        <button onClick={() => setShowMobilePlayer(false)} aria-label="Close" className="text-2xl">⌄</button>
        <span className="text-xs uppercase tracking-widest">{nowPlaying.genre_tags[0]}</span>
        <span className="w-6" />
      </div>

      <img
        src={nowPlaying.album_art_url}
        alt={nowPlaying.title}
        className="w-full max-w-sm mx-auto aspect-square object-cover rounded-lg shadow-2xl mb-4 max-h-[32vh]"
      />

      <h2 className="text-2xl font-extrabold text-white">{nowPlaying.title}</h2>
      <p className="text-spotify-subtle mb-3">{nowPlaying.artist}</p>

      <div className="rounded-lg bg-gradient-to-br from-spotify-green/25 to-white/5 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-spotify-green">✨</span>
          <span className="text-xs font-bold uppercase tracking-wide text-spotify-green">Why this track</span>
        </div>
        <p className="text-sm text-white leading-relaxed">
          {whyLoading ? 'Thinking…' : currentWhy || '—'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-8 text-white mt-3">
        <button onClick={prev} aria-label="Previous">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M7 6h2v12H7zM20 6v12l-9-6z"/></svg>
        </button>
        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-white text-black grid place-items-center"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <button onClick={next} aria-label="Next">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M15 6h2v12h-2zM4 6l9 6-9 6z"/></svg>
        </button>
      </div>

      <div className="flex gap-3 mt-4 shrink-0">
        <button
          onClick={like}
          className="flex-1 py-3 rounded-full bg-spotify-green text-black font-bold"
        >
          {liked ? 'Liked' : 'Like'}
        </button>
        <button
          onClick={skip}
          className="flex-1 py-3 rounded-full border border-white/40 text-white font-bold"
        >
          Skip ▷▷
        </button>
      </div>
    </div>
  )
}
