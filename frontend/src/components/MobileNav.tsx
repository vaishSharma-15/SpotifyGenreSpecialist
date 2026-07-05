import { useStore } from '../store'

export default function MobileNav() {
  const { view, setView, showMobilePlayer } = useStore()
  if (showMobilePlayer) return null

  const item = (label: string, path: string, active: boolean, onClick: () => void, green = false) => (
    <button
      key={label}
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] text-center leading-tight font-semibold transition ${
        green ? 'text-spotify-green' : active ? 'text-white' : 'text-spotify-subtle'
      }`}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d={path} />
      </svg>
      {label}
    </button>
  )

  return (
    <nav
      className="md:hidden flex bg-black border-t border-white/5 shrink-0"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {item('Home', 'M12 3.3l8 7.1V21h-5.5v-6h-5V21H4V10.4z', view === 'home', () => setView('home'))}
      {item(
        'AI Discovery',
        'M13 2a1 1 0 01.9.55L15.8 6l3.8.6a1 1 0 01.55 1.7l-2.75 2.7.65 3.8a1 1 0 01-1.45 1.05L13 14l-3.4 1.8a1 1 0 01-1.45-1.05l.65-3.8L6.05 8.3A1 1 0 016.6 6.6L10.4 6l1.7-3.45A1 1 0 0113 2z',
        view === 'discovery', () => setView('discovery'), true,
      )}
      {item(
        'Your Library',
        'M3 22V2l7 5-7 5zM12 3h9v2h-9zM12 8h9v2h-9zM12 19h9v2h-9zM12 14h9v2h-9z',
        view === 'library', () => setView('library'),
      )}
      {item(
        'Premium',
        'M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5z',
        false, () => {},
      )}
      {item('Create', 'M11 5h2v14h-2zM5 11h14v2H5z', false, () => setView('discovery'))}
    </nav>
  )
}
