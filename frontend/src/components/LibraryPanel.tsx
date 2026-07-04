import type { Genre, Mood } from '../types'
import { useStore } from '../store'

interface Props {
  genres: Genre[]
  moods: Mood[]
}

export default function LibraryPanel({ genres, moods }: Props) {
  const { genre, mood, dial, view, setGenre, setMood, setDial, setView } = useStore()
  const dialLabel = dial < 0.34 ? 'Safe' : dial < 0.67 ? 'Balanced' : 'Adventurous'

  return (
    <aside className="flex flex-col gap-2 h-full text-spotify-subtle">
      {/* Nav card */}
      <div className="bg-spotify-base rounded-lg p-2">
        <button
          onClick={() => setView('home')}
          className={`w-full flex items-center gap-4 px-3 py-2 rounded font-bold text-sm transition ${
            view === 'home' ? 'text-white' : 'hover:text-white'
          }`}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 3.3l8 7.1V21h-5.5v-6h-5V21H4V10.4z" />
          </svg>
          Home
        </button>
        <button
          onClick={() => setView('discovery')}
          className={`w-full flex items-center gap-4 px-3 py-2 rounded font-bold text-sm transition ${
            view === 'discovery' ? 'text-white' : 'hover:text-white'
          }`}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-2 6l7 4-7 4z" />
          </svg>
          Discovery
        </button>
      </div>

      {/* Library / session card */}
      <div className="bg-spotify-base rounded-lg p-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 font-bold text-white text-sm">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M3 22V2l7 5-7 5zM12 3h9v2h-9zM12 8h9v2h-9zM12 19h9v2h-9zM12 14h9v2h-9z" />
            </svg>
            Your Library
          </span>
        </div>

        <label className="block text-[11px] font-bold uppercase tracking-wide mb-1">🔒 Genre</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full mb-4 bg-spotify-highlight text-white rounded px-3 py-2 text-sm outline-none"
        >
          {genres.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>

        <label className="block text-[11px] font-bold uppercase tracking-wide mb-1">🎭 Mood</label>
        <select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="w-full mb-4 bg-spotify-highlight text-white rounded px-3 py-2 text-sm outline-none"
        >
          <option value="">Any mood</option>
          {moods.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide mb-2">
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
          className="w-full"
        />
      </div>
    </aside>
  )
}
