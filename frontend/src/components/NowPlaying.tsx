import { useStore } from '../store'

export default function NowPlaying() {
  const { nowPlaying, currentWhy, whyLoading, feedback } = useStore()

  return (
    <aside className="hidden lg:flex flex-col bg-spotify-base rounded-lg overflow-hidden h-full w-[360px] shrink-0">
      {nowPlaying ? (
        <div className="flex flex-col overflow-y-auto">
          <div className="px-4 py-3 font-bold text-white truncate">{nowPlaying.title}</div>
          <div className="px-4">
            <img
              src={nowPlaying.album_art_url}
              alt={nowPlaying.title}
              className="w-full aspect-square object-cover rounded-lg shadow-xl"
            />
          </div>
          <div className="px-4 pt-4">
            <h2 className="text-2xl font-extrabold text-white leading-tight">{nowPlaying.title}</h2>
            <p className="text-spotify-subtle">{nowPlaying.artist}</p>
          </div>

          {/* WHY explanation — the product's core differentiator */}
          <div className="m-4 rounded-lg bg-gradient-to-br from-spotify-green/25 to-spotify-highlight p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-spotify-green text-lg">✨</span>
              <span className="text-xs font-bold uppercase tracking-wide text-spotify-green">
                Why this track
              </span>
            </div>
            <p className="text-sm text-white leading-relaxed min-h-[3rem]">
              {whyLoading ? 'Thinking…' : currentWhy || 'Press play to hear why this fits you.'}
            </p>
          </div>

          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-1">
              {nowPlaying.genre_tags[0] && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-spotify-subtle">
                  {nowPlaying.genre_tags[0]}
                </span>
              )}
              {nowPlaying.mood && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-spotify-green/15 text-spotify-green">
                  {nowPlaying.mood}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div>
            <p className="text-white font-bold mb-1">Nothing playing</p>
            <p className="text-spotify-subtle text-sm">Hit ▶ on a track to hear it and see why it fits.</p>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="mt-auto border-t border-white/5 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-white mb-2">Recent activity</h3>
        {feedback.length === 0 ? (
          <p className="text-xs text-spotify-subtle/60">No feedback yet.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {feedback.slice(0, 5).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-spotify-subtle">
                <span className={f.action === 'SAVE' ? 'text-spotify-green' : ''}>
                  {f.action === 'SAVE' ? '♥' : '⤳'}
                </span>
                {f.action.toLowerCase()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
