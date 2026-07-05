import { useStore } from '../store'
import TrackCard from './TrackCard'

const MIX_GRADIENTS = [
  'from-[#3d5a99] to-[#8fa8d9]',
  'from-[#8f3d99] to-[#d98fce]',
  'from-[#997a3d] to-[#d9bd8f]',
  'from-[#3d9973] to-[#8fd9b8]',
  'from-[#993d3d] to-[#d98f8f]',
]

/** Your Library: liked songs + saved mixes in one place (mainly for mobile,
 * where the desktop sidebar isn't available). */
export default function Library() {
  const { likedTracks, savedMixes, applyMix } = useStore()

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold text-white">Your Library</h1>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">Liked Songs</h2>
        {likedTracks.length === 0 ? (
          <p className="text-spotify-subtle text-sm">Tap the ♥ on any song to save it here.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {likedTracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-3">Your Saved Mixes</h2>
        {savedMixes.length === 0 ? (
          <p className="text-spotify-subtle text-sm">
            Save a genre + mood combo from AI Discovery to pin it here.
          </p>
        ) : (
          <div className="space-y-1">
            {savedMixes.map((m, i) => (
              <button
                key={`${m.genre}-${m.mood}`}
                onClick={() => applyMix(m.genre, m.mood)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-spotify-highlight transition text-left"
              >
                <span
                  className={`w-12 h-12 rounded grid place-items-center bg-gradient-to-br ${MIX_GRADIENTS[i % MIX_GRADIENTS.length]} text-white/90 shrink-0`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-white font-semibold text-sm truncate">
                    {m.genre}{m.mood ? ` · ${m.mood}` : ''}
                  </span>
                  <span className="block text-xs text-spotify-subtle truncate">Mix</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
