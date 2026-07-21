import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlayerBar() {
  const {
    nowPlaying, isPlaying, togglePlay, setIsPlaying, next, prev, setShowMobilePlayer,
    progress, duration, setProgress, setDuration, seekTo, seek, refreshPreview,
  } = useStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [volume, setVolume] = useState(0.8)
  const [noPreview, setNoPreview] = useState(false)
  const retriedRef = useRef<string | null>(null)

  // Load a new source when the track changes.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !nowPlaying) return
    retriedRef.current = null
    setNoPreview(!nowPlaying.preview_url)
    a.src = nowPlaying.preview_url || ''
    if (nowPlaying.preview_url && isPlaying) a.play().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlaying?.id])

  // Deezer's preview links expire; a stale one fails to load/play regardless of
  // how long the track has been sitting in the queue. Refetch once and retry.
  const onAudioError = async () => {
    const id = nowPlaying?.id
    if (!id || retriedRef.current === id) {
      setNoPreview(true)
      return
    }
    retriedRef.current = id
    try {
      const freshUrl = await refreshPreview(id)
      const a = audioRef.current
      if (!a || !freshUrl || useStore.getState().nowPlaying?.id !== id) return
      a.src = freshUrl
      if (useStore.getState().isPlaying) a.play().catch(() => {})
    } catch {
      setNoPreview(true)
    }
  }

  // Reflect play/pause state onto the element.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !nowPlaying?.preview_url) return
    if (isPlaying) a.play().catch(() => {})
    else a.pause()
  }, [isPlaying, nowPlaying?.preview_url])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Seek requests can come from here or from MobilePlayer (via the store).
  useEffect(() => {
    const a = audioRef.current
    if (!a || seekTo === null) return
    a.currentTime = seekTo
    setProgress(seekTo)
    seek(null as unknown as number)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo])

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current
    if (!a) return
    a.currentTime = parseFloat(e.target.value)
    setProgress(a.currentTime)
  }

  return (
    <footer className="hidden md:flex h-[72px] bg-black text-white items-center px-2 sm:px-4 gap-3">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setIsPlaying(false)
          next()
        }}
        onError={onAudioError}
      />

      {/* Left: track */}
      <button
        onClick={() => nowPlaying && setShowMobilePlayer(true)}
        className="flex items-center gap-3 w-[30%] min-w-0 text-left"
      >
        {nowPlaying ? (
          <>
            <img src={nowPlaying.album_art_url} alt="" className="w-14 h-14 rounded object-cover" />
            <div className="min-w-0 hidden xs:block sm:block">
              <p className="text-sm font-semibold truncate">{nowPlaying.title}</p>
              <p className="text-xs text-spotify-subtle truncate">{nowPlaying.artist}</p>
            </div>
          </>
        ) : (
          <span className="text-spotify-subtle text-sm">Nothing playing</span>
        )}
      </button>

      {/* Center: controls */}
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="flex items-center gap-5 text-spotify-subtle">
          <button className="hover:text-white transition hidden sm:block" aria-label="Shuffle">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 3l4 4-4 4V8h-2.5l-2 2-1.4-1.4L13.1 6H17V3zM3 6h4l3 3-1.4 1.4L6 8H3V6zm14 9v-3l4 4-4 4v-3h-3.9l-2.5-2.5L12 12l2 2H17zM3 16h3l8-8 1.4 1.4L7.4 18H3v-2z"/></svg>
          </button>
          <button onClick={prev} className="hover:text-white transition" aria-label="Previous">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 6h2v12H7zM20 6v12l-9-6z"/></svg>
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white text-black grid place-items-center hover:scale-105 transition"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button onClick={next} className="hover:text-white transition" aria-label="Next">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15 6h2v12h-2zM4 6l9 6-9 6z"/></svg>
          </button>
          <button className="hover:text-white transition hidden sm:block" aria-label="Repeat">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
          </button>
        </div>
        <div className="w-full max-w-[520px] flex items-center gap-2">
          <span className="text-[10px] text-spotify-subtle w-8 text-right">{fmt(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={progress}
            onChange={onSeek}
            style={{ ['--pct' as string]: `${duration ? (progress / duration) * 100 : 0}%` }}
            className="flex-1"
          />
          <span className="text-[10px] text-spotify-subtle w-8">{fmt(duration || 30)}</span>
        </div>
        {noPreview && (
          <span className="text-[10px] text-spotify-subtle/70">No preview for this track</span>
        )}
      </div>

      {/* Right: volume */}
      <div className="w-[30%] hidden sm:flex justify-end items-center gap-2 text-spotify-subtle">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13 3a4 4 0 00-2-3.5v7A4 4 0 0016 12z"/></svg>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ ['--pct' as string]: `${volume * 100}%` }}
          className="w-24"
        />
      </div>
    </footer>
  )
}
