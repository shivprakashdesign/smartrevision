import { useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick02Icon, Alert02Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { dayMarkers, dayStatus } from './metrics'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function isoOf(d) {
  const z = new Date(d)
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`
}
function startOfWeek(d) {
  const z = new Date(d)
  z.setHours(0, 0, 0, 0)
  z.setDate(z.getDate() - z.getDay()) // back up to Sunday
  return z
}

function DayBadge({ st }) {
  if (st.kind === 'empty') return <span className="w-1.5 h-1.5 rounded-full bg-[var(--card-alt)]" />
  const base = 'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold'
  if (st.kind === 'done') {
    return <span className={base} style={{ backgroundColor: 'rgba(16,185,129,0.16)', color: '#059669' }}><HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} /></span>
  }
  if (st.kind === 'missed') {
    return <span className={base} style={{ backgroundColor: 'rgba(239,68,68,0.14)', color: '#ef4444' }}><HugeiconsIcon icon={Alert02Icon} size={13} strokeWidth={2.2} /></span>
  }
  // A rest day the student marked off: never an alarm, just a calm dash. The
  // revision it may carry is still actionable in Due Today — it isn't lost.
  if (st.kind === 'rest') {
    return <span className={base} aria-label="Rest day"><span className="w-2.5 h-0.5 rounded-full bg-[var(--muted)] opacity-60" /></span>
  }
  return <span className={base} style={{ backgroundColor: 'rgba(37,99,235,0.12)', color: 'hsl(213,96%,56%)' }}>+{st.count}</span>
}

// A rest day is one not in study_days (ISO dow: Mon=1..Sun=7). With no set
// recorded we treat every day as a study day, matching the old behaviour.
function isRestDay(d, studyDays) {
  if (!studyDays?.length) return false
  const isoDow = d.getDay() === 0 ? 7 : d.getDay()
  return !studyDays.includes(isoDow)
}

// At-a-glance week overview with per-day status badges and week navigation.
export default function WeekStrip({ topics, studyDays }) {
  const [offset, setOffset] = useState(0) // weeks from the current one

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = isoOf(today)

  const dayMap = useMemo(() => dayMarkers(topics, todayStr), [topics, todayStr])

  const anchor = new Date(today)
  anchor.setDate(anchor.getDate() + offset * 7)
  const start = startOfWeek(anchor)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const headerDate = offset === 0 ? today : start
  const headerLabel = headerDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const navBtn = 'w-9 h-9 rounded-lg flex items-center justify-center text-[var(--slate-txt)] border border-[var(--border)] active:scale-90 transition-transform'

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-[14px] font-bold text-[var(--ink)] tracking-tight truncate">{headerLabel}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setOffset(o => o - 1)} aria-label="Previous week" className={navBtn}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={2} />
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="px-3 h-9 rounded-lg text-[12px] font-bold text-brand-500 border border-[var(--border)] active:scale-90 transition-transform">
              Today
            </button>
          )}
          <button onClick={() => setOffset(o => o + 1)} aria-label="Next week" className={navBtn}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex">
        {days.map((d, i) => {
          const ds = isoOf(d)
          const isToday = ds === todayStr
          const raw = dayStatus(dayMap[ds])
          // On a rest day, soften an alarm (missed) or a blank into a rest
          // marker; a completed tick or an upcoming due count still stand.
          const st = isRestDay(d, studyDays) && (raw.kind === 'missed' || raw.kind === 'empty')
            ? { kind: 'rest' }
            : raw
          return (
            <div key={ds} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-[var(--muted)]">{DOW[i]}</span>
              <span className={`text-[14px] font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-500 text-white' : 'text-[var(--ink)]'}`}>
                {d.getDate()}
              </span>
              <div className="h-6 flex items-center justify-center">
                <DayBadge st={st} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
