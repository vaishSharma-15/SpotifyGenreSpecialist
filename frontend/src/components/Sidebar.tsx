import type { Genre, Persona } from '../types'
import { useStore } from '../store'

interface Props {
  personas: Persona[]
  genres: Genre[]
}

export default function Sidebar({ personas, genres }: Props) {
  const { personaId, genre, dial, view, feedback, setPersona, setGenre, setDial, setView } =
    useStore()

  const dialLabel = dial < 0.34 ? 'Safe' : dial < 0.67 ? 'Balanced' : 'Adventurous'

  return (
    <aside className="hidden md:flex w-72 flex-col gap-2 p-2 bg-black text-spotify-subtle">
      {/* Brand + nav */}
      <div className="bg-spotify-base rounded-lg p-5">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-spotify-green text-2xl">◉</span>
          <span className="text-white font-bold text-lg tracking-tight">Discovery DJ</span>
        </div>
        <nav className="flex flex-col gap-4">
          <button
            onClick={() => setView('home')}
            className={`flex items-center gap-4 text-sm font-bold transition ${
              view === 'home' ? 'text-white' : 'hover:text-white'
            }`}
          >
            <span className="text-xl">⌂</span> Home
          </button>
          <button
            onClick={() => setView('discovery')}
            className={`flex items-center gap-4 text-sm font-bold transition ${
              view === 'discovery' ? 'text-white' : 'hover:text-white'
            }`}
          >
            <span className="text-xl">◈</span> Discovery
          </button>
        </nav>
      </div>

      {/* Controls */}
      <div className="bg-spotify-base rounded-lg p-5 flex-1 overflow-y-auto">
        <h2 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Your Session</h2>

        <label className="block text-xs font-bold uppercase mb-1">Profile</label>
        <select
          value={personaId}
          onChange={(e) => setPersona(e.target.value)}
          className="w-full mb-5 bg-spotify-highlight text-white rounded px-3 py-2 text-sm outline-none"
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <label className="block text-xs font-bold uppercase mb-1">🔒 Genre Lock</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full mb-5 bg-spotify-highlight text-white rounded px-3 py-2 text-sm outline-none"
        >
          {genres.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>

        <div className="flex justify-between text-xs font-bold uppercase mb-2">
          <span>Safe</span>
          <span className="text-spotify-green">{dialLabel}</span>
          <span>Bold</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={dial}
          onChange={(e) => setDial(parseFloat(e.target.value))}
          style={{ ['--pct' as string]: `${dial * 100}%` }}
          className="w-full mb-6"
        />

        <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-wide">
          Recent Activity
        </h3>
        {feedback.length === 0 ? (
          <p className="text-xs text-spotify-subtle/60">No feedback yet — save or skip a track.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {feedback.slice(0, 8).map((f, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={f.action === 'SAVE' ? 'text-spotify-green' : 'text-spotify-subtle'}>
                  {f.action === 'SAVE' ? '♥' : '⤳'}
                </span>
                <span className="truncate">{f.action.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
