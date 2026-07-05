const FILTERS = ['All', 'Music', 'Podcasts', 'Audiobooks']

/** Spotify-style content filter pills — visual only, "All" is the permanent state. */
export default function FilterTabs() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
      {FILTERS.map((f, i) => (
        <span
          key={f}
          aria-disabled="true"
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold select-none ${
            i === 0 ? 'bg-white text-black' : 'bg-spotify-elevated text-white/70'
          }`}
        >
          {f}
        </span>
      ))}
    </div>
  )
}
