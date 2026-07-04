import { useStore } from '../store'

export default function PlayerBar() {
  const { nowPlaying } = useStore()

  return (
    <footer className="h-20 bg-spotify-base border-t border-white/10 flex items-center px-4 gap-4">
      <div className="flex items-center gap-3 w-1/3 min-w-0">
        {nowPlaying ? (
          <>
            <img
              src={nowPlaying.album_art_url}
              alt=""
              className="w-14 h-14 rounded object-cover"
            />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{nowPlaying.title}</p>
              <p className="text-spotify-subtle text-xs truncate">{nowPlaying.artist}</p>
            </div>
          </>
        ) : (
          <p className="text-spotify-subtle text-sm">Nothing playing</p>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-6 text-spotify-subtle">
          <button className="hover:text-white transition">⤨</button>
          <button className="hover:text-white transition">◁◁</button>
          <button className="w-9 h-9 rounded-full bg-white text-black grid place-items-center hover:scale-105 transition">
            ▶
          </button>
          <button className="hover:text-white transition">▷▷</button>
          <button className="hover:text-white transition">↻</button>
        </div>
        <div className="w-full max-w-xl flex items-center gap-2">
          <span className="text-[10px] text-spotify-subtle">0:00</span>
          <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full w-1/3 bg-white" />
          </div>
          <span className="text-[10px] text-spotify-subtle">3:12</span>
        </div>
      </div>

      <div className="w-1/3 flex justify-end items-center gap-2 text-spotify-subtle">
        <span className="text-sm">♪</span>
        <div className="w-24 h-1 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-2/3 bg-white" />
        </div>
      </div>
    </footer>
  )
}
