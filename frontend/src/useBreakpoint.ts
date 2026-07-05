import { useEffect, useState } from 'react'
import { useStore } from './store'

/**
 * Is the viewport at least `px` wide? Reactive to real window resizes, but a
 * store-level device override (mentor preview toggle) can force the answer
 * either way — same page, same DOM, no navigation or reload.
 */
export function useBreakpoint(px: number): boolean {
  const deviceOverride = useStore((s) => s.deviceOverride)
  const [matches, setMatches] = useState(() => window.matchMedia(`(min-width: ${px}px)`).matches)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`)
    const handler = () => setMatches(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [px])

  if (deviceOverride === 'desktop') return true
  if (deviceOverride === 'mobile') return false
  return matches
}
