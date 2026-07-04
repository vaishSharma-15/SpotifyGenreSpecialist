import { useEffect, useRef, useState } from 'react'

type Device = 'desktop' | 'mobile'
const FRAMES: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1440, h: 900, label: 'Desktop' },
  mobile: { w: 390, h: 844, label: 'Mobile' },
}

/**
 * Mentor preview: renders the live app inside a framed viewport so the same
 * build can be seen as desktop or phone. An <iframe> has its own viewport, so
 * the responsive breakpoints genuinely switch — this is the real layout, not a mock.
 */
export default function PreviewShell() {
  const [device, setDevice] = useState<Device>('desktop')
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const frame = FRAMES[device]

  useEffect(() => {
    const compute = () => {
      const availW = (stageRef.current?.clientWidth ?? window.innerWidth) - 48
      const availH = window.innerHeight - 150
      setScale(Math.min(1, availW / frame.w, availH / frame.h))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [device, frame.w, frame.h])

  // Load the real app without the preview flag so it doesn't recurse.
  const src = `${import.meta.env.BASE_URL}?embed=1`

  return (
    <div className="h-full flex flex-col bg-[#0b0b0b] text-white">
      {/* Toolbar */}
      <header className="flex items-center gap-4 px-5 h-16 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold">
          <span className="w-3 h-3 rounded-full bg-spotify-green shadow-[0_0_12px_rgba(30,215,96,.7)]" />
          Discovery DJ
          <span className="text-spotify-subtle font-normal text-sm ml-1">· Mentor preview</span>
        </div>

        {/* Segmented device toggle */}
        <div className="mx-auto flex items-center gap-1 p-1 rounded-full bg-spotify-highlight">
          {(Object.keys(FRAMES) as Device[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                device === d ? 'bg-white text-black' : 'text-spotify-subtle hover:text-white'
              }`}
            >
              {d === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
            </button>
          ))}
        </div>

        <a
          href={import.meta.env.BASE_URL}
          className="text-sm font-semibold text-spotify-subtle hover:text-white transition"
        >
          Exit ✕
        </a>
      </header>

      {/* Stage */}
      <div ref={stageRef} className="flex-1 grid place-items-center overflow-auto p-6">
        <div
          className={device === 'mobile' ? 'bg-gradient-to-b from-[#2a2a2a] to-black rounded-[44px] p-[10px] shadow-2xl' : 'rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10'}
          style={{ width: frame.w * scale, height: frame.h * scale + (device === 'mobile' ? 20 : 0) }}
        >
          <iframe
            title={`${frame.label} preview`}
            src={src}
            style={{
              width: frame.w,
              height: frame.h,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              borderRadius: device === 'mobile' ? 34 : 8,
            }}
          />
        </div>
      </div>

      <footer className="text-center text-xs text-spotify-subtle/60 py-3 border-t border-white/10">
        Same responsive React build · {frame.label} viewport {frame.w}×{frame.h} · scaled to fit
      </footer>
    </div>
  )
}
