import { useStore } from '../store'

export default function MobileNav() {
  const { view, setView } = useStore()
  const item = (v: 'home' | 'discovery', label: string, path: string) => (
    <button
      onClick={() => setView(v)}
      className={`flex-1 flex flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${
        view === v ? 'text-white' : 'text-spotify-subtle'
      }`}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d={path} />
      </svg>
      {label}
    </button>
  )
  return (
    <nav className="md:hidden flex bg-black border-t border-white/5">
      {item('home', 'Home', 'M12 3.3l8 7.1V21h-5.5v-6h-5V21H4V10.4z')}
      {item('discovery', 'Discovery', 'M12 2a10 10 0 100 20 10 10 0 000-20zm-2 6l7 4-7 4z')}
    </nav>
  )
}
