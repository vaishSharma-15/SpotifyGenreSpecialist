import { useStore } from '../store'

const OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'desktop', label: '🖥' },
  { id: 'mobile', label: '📱' },
] as const

/** Always-visible mentor control: force Desktop/Mobile layout live, same page,
 * same state — never tucked inside a conditionally-hidden header. */
export default function DeviceToggle() {
  const { deviceOverride, setDeviceOverride } = useStore()
  return (
    <div className="fixed top-2 right-2 z-[60] flex items-center gap-0.5 p-0.5 rounded-full bg-black/85 backdrop-blur border border-white/10 text-[11px] shadow-lg">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => setDeviceOverride(o.id)}
          title={`View as ${o.id}`}
          className={`px-2 py-1 rounded-full font-semibold transition ${
            deviceOverride === o.id ? 'bg-white text-black' : 'text-white/70 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
