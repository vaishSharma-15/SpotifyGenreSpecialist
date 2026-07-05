import { useState } from 'react'
import { useStore } from '../store'

const MIX_GRADIENTS = [
  'from-[#3d5a99] to-[#8fa8d9]',
  'from-[#8f3d99] to-[#d98fce]',
  'from-[#997a3d] to-[#d9bd8f]',
  'from-[#3d9973] to-[#8fd9b8]',
  'from-[#993d3d] to-[#d98f8f]',
]

const FAKE_ARTISTS = [
  { name: 'Shilpa Rao', img: 'https://picsum.photos/seed/artist-shilpa/100' },
  { name: 'Shreya Ghoshal', img: 'https://picsum.photos/seed/artist-shreya/100' },
  { name: 'Arijit Singh', img: 'https://picsum.photos/seed/artist-arijit/100' },
]

type LibFilter = 'playlists' | 'artists'

/** Spotify-style left rail: Home/Search nav pill + a real "Your Library" card. */
export default function LibraryPanel() {
  const { view, setView, likedTracks, savedMixes, applyMix } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [filter, setFilter] = useState<LibFilter>('playlists')

  const showPlaylists = filter === 'playlists'

  return (
    <aside className="flex flex-col gap-2 h-full text-spotify-subtle">
      {/* Nav */}
      <div className="bg-spotify-base rounded-lg p-2">
        <NavItem
          active={view === 'discovery'} onClick={() => setView('discovery')}
          path="M13 2a1 1 0 01.9.55L15.8 6l3.8.6a1 1 0 01.55 1.7l-2.75 2.7.65 3.8a1 1 0 01-1.45 1.05L13 14l-3.4 1.8a1 1 0 01-1.45-1.05l.65-3.8L6.05 8.3A1 1 0 016.6 6.6L10.4 6l1.7-3.45A1 1 0 0113 2z"
          label="AI Discovery"
          green
        />
      </div>

      {/* Your Library */}
      <div className="bg-spotify-base rounded-lg flex-1 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-2 font-bold text-white text-sm hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M3 22V2l7 5-7 5zM12 3h9v2h-9zM12 8h9v2h-9zM12 19h9v2h-9zM12 14h9v2h-9z" />
            </svg>
            Your Library
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView('discovery')}
              aria-label="Create a new mix"
              className="w-8 h-8 rounded-full grid place-items-center hover:bg-spotify-highlight hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11 5h2v14h-2zM5 11h14v2H5z" /></svg>
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand library' : 'Collapse library'}
              className="w-8 h-8 rounded-full grid place-items-center hover:bg-spotify-highlight hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M15 3h6v6h-2V6.4l-5 5L12.6 10l5-5H15zM3 15h2v2.6l5-5L11.4 14l-5 5H9v2H3z" />
              </svg>
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {/* Playlists / Artists filter pills */}
            <div className="flex items-center gap-2 px-3 pb-2">
              {(['playlists', 'artists'] as LibFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition ${
                    filter === f ? 'bg-spotify-highlight text-white' : 'text-spotify-subtle hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Search + sort row */}
            <div className="flex items-center justify-between px-3 pb-2">
              <button aria-label="Search in Your Library" className="p-1 hover:text-white transition">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M10.5 3a7.5 7.5 0 015.9 12.1l4.2 4.2-1.4 1.4-4.2-4.2A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
                </svg>
              </button>
              <button className="flex items-center gap-1 text-xs font-semibold hover:text-white transition">
                Recents
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M3 5h14v2H3zM3 11h10v2H3zM3 17h6v2H3z" />
                </svg>
              </button>
            </div>

            <div className="px-2 pb-3 flex-1 overflow-y-auto">
              {showPlaylists ? (
                <>
                  {/* Liked Songs pinned entry */}
                  <button
                    onClick={() => setView('home')}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-spotify-highlight transition text-left"
                  >
                    <span className="w-12 h-12 rounded grid place-items-center bg-gradient-to-br from-[#4400bb] to-[#9b78ff] text-white shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-6.7-4.35-9.33-8.02C.9 10.3 1.5 6.9 4.2 5.6c1.9-.9 4.1-.3 5.3 1.3l.5.7.5-.7c1.2-1.6 3.4-2.2 5.3-1.3 2.7 1.3 3.3 4.7 1.53 7.38C18.7 16.65 12 21 12 21z"/></svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-white font-semibold text-sm">Liked Songs</span>
                      <span className="flex items-center gap-1 text-xs truncate">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="#1ED760"><path d="M12 2l1.6 5h5.2l-4.2 3.1 1.6 5-4.2-3-4.2 3 1.6-5-4.2-3.1h5.2z"/></svg>
                        Playlist · {likedTracks.length} song{likedTracks.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>

                  {/* Fake pinned playlist, like a real library would show */}
                  <button className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-spotify-highlight transition text-left">
                    <img
                      src="https://picsum.photos/seed/myplaylist1/100"
                      alt=""
                      className="w-12 h-12 rounded object-cover shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-white font-semibold text-sm truncate">My playlist #1</span>
                      <span className="block text-xs truncate">Playlist</span>
                    </span>
                  </button>

                  {/* Saved mixes as playlist-style rows */}
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
                        <span className="block text-xs truncate">Mix</span>
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                FAKE_ARTISTS.map((a) => (
                  <button
                    key={a.name}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-spotify-highlight transition text-left"
                  >
                    <img src={a.img} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-white font-semibold text-sm truncate">{a.name}</span>
                      <span className="block text-xs truncate">Artist</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

function NavItem({ active, onClick, path, label, green }: {
  active: boolean; onClick: () => void; path: string; label: string; green?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-3 py-2 rounded font-bold text-sm transition ${
        green ? 'text-spotify-green' : active ? 'text-white' : 'hover:text-white'
      }`}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d={path} /></svg>
      {label}
    </button>
  )
}
