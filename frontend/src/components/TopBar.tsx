import { useStore } from '../store'

export default function TopBar() {
  const { view, setView } = useStore()
  const params = new URLSearchParams(window.location.search)
  const isEmbedded = params.get('embed') === '1'

  return (
    <header
      className={`h-16 items-center gap-4 px-4 bg-black text-white ${
        view === 'discovery' ? 'hidden md:flex' : 'flex'
      }`}
    >
      {/* Spotify glyph — acts as Home */}
      <button
        onClick={() => setView('home')}
        className="w-8 h-8 rounded-full bg-black grid place-items-center shrink-0"
        aria-label="Home"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="#1ED760" aria-hidden>
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.62.62 0 01-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 11-.28-1.21c3.81-.87 7.08-.5 9.72 1.11.3.18.39.57.21.85zm1.23-2.73a.78.78 0 01-1.07.26c-2.69-1.65-6.8-2.13-9.98-1.17a.78.78 0 11-.45-1.49c3.64-1.1 8.17-.56 11.25 1.33.37.22.48.7.25 1.07zm.1-2.85C14.83 8.98 9.5 8.8 6.42 9.73a.94.94 0 11-.54-1.8c3.53-1.07 9.42-.86 13.13 1.34a.94.94 0 01-.96 1.61z" />
        </svg>
      </button>

      {/* Home + search (center-left, Spotify layout) */}
      <div className="flex-1 flex items-center justify-center gap-2 max-w-2xl mx-auto">
        {view === 'home' && (
          <button
            onClick={() => setView('home')}
            className="w-12 h-12 rounded-full grid place-items-center transition shrink-0 bg-white text-black"
            aria-label="Home"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 3.3l8 7.1V21h-5.5v-6h-5V21H4V10.4z" />
            </svg>
          </button>
        )}
        {view === 'home' && (
          <div className="flex-1 flex items-center gap-3 h-12 px-4 rounded-full bg-spotify-highlight hover:bg-[#2a2a2a] transition">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#b3b3b3">
              <path d="M10.5 3a7.5 7.5 0 015.9 12.1l4.2 4.2-1.4 1.4-4.2-4.2A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
            </svg>
            <span className="text-spotify-subtle text-sm">What do you want to play?</span>
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        {!isEmbedded && (
          <a
            href="?preview=1"
            className="text-sm font-bold text-spotify-subtle hover:text-white hover:scale-105 transition"
            title="Preview this app as Desktop or Mobile"
          >
            🖥 / 📱 Preview
          </a>
        )}
        <button className="text-sm font-bold text-spotify-subtle hover:text-white hover:scale-105 transition">
          Explore Premium
        </button>
        <button className="flex items-center gap-2 text-sm font-bold text-spotify-subtle hover:text-white transition">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 3v10.6l3.3-3.3 1.4 1.4L12 17.4 6.3 11.7l1.4-1.4L11 13.6V3zM5 19h14v2H5z" />
          </svg>
          Install App
        </button>
        <div
          className="w-8 h-8 rounded-full bg-[#7b46b0] grid place-items-center text-white cursor-default"
          aria-label="Profile"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.24-8 5v1h16v-1c0-2.76-3.6-5-8-5z" />
          </svg>
        </div>
      </div>
    </header>
  )
}
