import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon, BookOpen02Icon, PlusSignIcon, Plant01Icon, ChampionIcon
} from '@hugeicons/core-free-icons'

// Native-feeling bottom tab bar. Fixed to the bottom, floats above content,
// and respects the iOS home-indicator safe area. The center "+" is a raised
// brand action (Add topic); the four flanking tabs are Home/Topics · Progress/Rank.
// Icons are HugeIcons (matching the design mockup).

const TABS = [
  { to: '/home', label: 'Home', icon: Home01Icon, anim: 'home' },
  { to: '/topics', label: 'Topics', icon: BookOpen02Icon, anim: 'book' },
  { to: '/progress', label: 'Progress', icon: Plant01Icon, anim: 'plant' },
  { to: '/leaderboard', label: 'Rank', icon: ChampionIcon, anim: 'trophy' }
]

function Tab({ to, label, icon, anim }) {
  const { pathname } = useLocation()
  const active = pathname === to
  // Bump on each tap so the icon replays even when the tab is already active.
  // Each screen mounts its own AppShell/BottomNav, so navigating to a tab
  // remounts this component fresh — the active tab then plays its animation on
  // mount. The key combines `active` + `tick` so the wrapping span remounts (and
  // the CSS one-shot restarts) both when this tab becomes active and on re-tap.
  const [tick, setTick] = useState(0)
  return (
    <Link
      to={to}
      onClick={() => setTick((t) => t + 1)}
      className="flex-1 flex flex-col items-center gap-1 py-1 active:scale-90 transition-transform"
      style={{ color: active ? 'hsl(213,96%,56%)' : 'var(--muted)' }}
      aria-current={active ? 'page' : undefined}
    >
      <span
        key={`${active}-${tick}`}
        className={active ? `tab-anim tab-anim-${anim}` : 'tab-anim'}
      >
        <HugeiconsIcon icon={icon} size={24} strokeWidth={active ? 2.4 : 1.8} />
      </span>
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </Link>
  )
}

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-sm mx-auto px-4 pb-2">
        <div
          className="pointer-events-auto relative flex items-center rounded-[28px] bg-[var(--card)] border border-[var(--border)] px-3 py-2"
          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
        >
          <Tab {...TABS[0]} />
          <Tab {...TABS[1]} />

          {/* Center Add action — a raised FAB that floats above the bar. The
              translate lifts the whole slot (layout untouched) while the Link keeps
              its own press-scale; the bg-coloured ring cuts it out of the bar. */}
          <div className="flex-1 flex justify-center items-center" style={{ transform: 'translateY(-30px)' }}>
            <Link
              to="/add-topic"
              aria-label="Add topic"
              className="w-14 h-14 rounded-full bg-brand-500 text-white flex items-center justify-center ring-4 ring-[var(--bg)] active:scale-90 transition-transform"
              style={{ boxShadow: '0 10px 22px rgba(37,99,235,0.42)' }}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={26} strokeWidth={2.6} />
            </Link>
          </div>

          <Tab {...TABS[2]} />
          <Tab {...TABS[3]} />
        </div>
      </div>
    </nav>
  )
}
