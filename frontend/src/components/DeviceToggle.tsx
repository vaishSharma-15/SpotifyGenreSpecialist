import { useStore } from '../store'

const OPTIONS = [
  { id: 'desktop', label: '🖥 Desktop' },
  { id: 'mobile', label: '📱 Mobile' },
] as const

/** Mentor control: preview the live app as Desktop or Mobile in place, on the
 * same page. Sits in its own strip (not floated) so it never overlaps real
 * app chrome like the profile menu or search bar. */
export default function DeviceToggle() {
  const { deviceOverride, setDeviceOverride } = useStore()
  return (
    <div className="flex items-center justify-center gap-1 py-1 bg-[#0b0b0b] border-b border-white/10 shrink-0">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => setDeviceOverride(o.id)}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
            deviceOverride === o.id ? 'bg-white text-black' : 'text-spotify-subtle hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
