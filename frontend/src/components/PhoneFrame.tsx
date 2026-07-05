import { useEffect, useState } from 'react'

const SCREEN = { w: 390, h: 844 } // iPhone-class logical points
const STATUS_H = 44

function clock() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Live iOS-style status bar: clock + cellular + wifi + battery. */
function StatusBar() {
  const [time, setTime] = useState(() => clock())
  useEffect(() => {
    const t = setInterval(() => setTime(clock()), 20000)
    return () => clearInterval(t)
  }, [])
  return (
    <div
      className="flex items-center justify-between px-7 text-white shrink-0 select-none"
      style={{ height: STATUS_H }}
    >
      <span className="text-[15px] font-semibold tabular-nums tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5">
        {/* cellular */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="white" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" />
        </svg>
        {/* wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="white" aria-hidden>
          <path d="M8 2.2c2.6 0 5 1 6.8 2.7l-1.3 1.4A7.6 7.6 0 008 4.1 7.6 7.6 0 002.5 6.3L1.2 4.9A9.6 9.6 0 018 2.2zm0 3.3c1.5 0 2.9.6 3.9 1.6l-1.4 1.4A3.7 3.7 0 008 8.7a3.7 3.7 0 00-2.5 1L4.1 8.4A5.5 5.5 0 018 5.5zm0 3.2c.6 0 1.2.3 1.6.7L8 11.2 6.4 9.4c.4-.4 1-.7 1.6-.7z" />
        </svg>
        {/* battery */}
        <div className="flex items-center gap-1">
          <div className="relative w-[25px] h-[12px] rounded-[3px] border border-white/60 p-[1.5px]">
            <div className="h-full rounded-[1.5px] bg-white" style={{ width: '72%' }} />
          </div>
          <div className="w-[1.5px] h-[4px] rounded-r bg-white/60" />
        </div>
      </div>
    </div>
  )
}

/** Real-looking iPhone bezel wrapping an iframe: status bar, dynamic island,
 * home indicator. Purely visual chrome — the iframe inside is the real app.
 * Auto-scales to fit the available space so it never clips on shorter screens. */
export default function PhoneFrame({ src }: { src: string }) {
  const appH = SCREEN.h - STATUS_H
  const BOX = { w: SCREEN.w + 24, h: SCREEN.h + 24 } // + bezel padding
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const compute = () => {
      const availH = window.innerHeight - 120
      const availW = window.innerWidth - 48
      setScale(Math.min(1, availH / BOX.h, availW / BOX.w))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ width: BOX.w * scale, height: BOX.h * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div className="relative bg-black rounded-[54px] p-[12px] shadow-[0_40px_80px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10">
          {/* side buttons */}
          <div className="absolute -left-[3px] top-[130px] w-[3px] h-16 rounded-l bg-[#222]" />
          <div className="absolute -right-[3px] top-[160px] w-[3px] h-24 rounded-r bg-[#222]" />
          <div
            className="relative overflow-hidden bg-black flex flex-col rounded-[42px]"
            style={{ width: SCREEN.w, height: SCREEN.h }}
          >
            <StatusBar />
            {/* Dynamic Island */}
            <div className="absolute top-[11px] left-1/2 -translate-x-1/2 w-[92px] h-[26px] rounded-full bg-black z-10" />
            <iframe title="Mobile preview" src={src} style={{ width: SCREEN.w, height: appH, border: 0 }} />
            {/* home indicator */}
            <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 w-[130px] h-[5px] rounded-full bg-white/85 z-10" />
          </div>
        </div>
      </div>
    </div>
  )
}
