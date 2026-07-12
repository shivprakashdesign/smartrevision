import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon, BookOpen02Icon, PlusSignIcon, Plant01Icon, ChampionIcon
} from '@hugeicons/core-free-icons'

// Native-feeling bottom tab bar. Laid out in normal document flow as the last
// child of AppShell's flex column and pinned to the viewport bottom with
// `position: sticky`. Sticky (not fixed) sidesteps the iOS standalone-PWA bug
// where position:fixed is painted against a not-yet-settled viewport on first
// load and lands too high until a reflow. It respects the iOS home-indicator
// safe area. Five equal slots: Home · Topics · Add · Progress · Rank. The Add
// action is a brand-filled chip sitting inline with the others (no raised FAB —
// keeps the bar flat and avoids overhanging content). Icons are HugeIcons.

// Fixed-height icon row so the 24px outline icons and the Add chip share a
// baseline and every label lines up.
const ICON_SLOT = 'h-7 flex items-center justify-center'

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
      <span className={ICON_SLOT}>
        <span
          key={`${active}-${tick}`}
          className={active ? `tab-anim tab-anim-${anim}` : 'tab-anim'}
        >
          <HugeiconsIcon icon={icon} size={24} strokeWidth={active ? 2.4 : 1.8} />
        </span>
      </span>
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </Link>
  )
}

// Add: the primary create action, styled as a flat brand-filled chip that lives
// inline in the row (same slot width and label baseline as the tabs).
function AddTab() {
  return (
    <Link
      to="/add-topic"
      aria-label="Add topic"
      className="flex-1 flex flex-col items-center gap-1 py-1 active:scale-90 transition-transform"
      style={{ color: 'var(--muted)' }}
    >
      <span className={ICON_SLOT}>
        <span className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center">
          <HugeiconsIcon icon={PlusSignIcon} size={18} strokeWidth={2.8} />
        </span>
      </span>
      <span className="text-[10px] font-bold tracking-tight">Add</span>
    </Link>
  )
}

export default function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 z-40 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-sm mx-auto px-4 pb-2">
        <div
          className="pointer-events-auto flex items-center rounded-[28px] bg-[var(--card)] border border-[var(--border)] px-3 py-2"
          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
        >
          <Tab {...TABS[0]} />
          <Tab {...TABS[1]} />
          <AddTab />
          <Tab {...TABS[2]} />
          <Tab {...TABS[3]} />
        </div>
      </div>
    </nav>
  )
}
