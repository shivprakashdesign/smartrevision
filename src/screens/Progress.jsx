import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberFlow from '@number-flow/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Fire02Icon, Diamond02Icon, ChampionIcon } from '@hugeicons/core-free-icons'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import AppShell from '../lib/AppShell'
import {
  computeMemory, isOnTrack, activeDates, longestStreak,
  completedByDay, recallBreakdown, memoryBySubject
} from '../lib/metrics'

// ── shared tones ────────────────────────────────────────────────────────────
const EMERALD = 'hsl(160,84%,39%)'
const AMBER = 'hsl(38,92%,50%)'
const RED = 'hsl(0,84%,60%)'
const BRAND = 'hsl(213,96%,56%)'

// Colour a memory% the same way Home does — low reads as "revise me", not fail.
function memColor(m) {
  if (m == null) return 'var(--slate-txt)'
  return m >= 67 ? EMERALD : m >= 40 ? AMBER : RED
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// ── memory ring ─────────────────────────────────────────────────────────────
function MemoryRing({ value }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(id)
  }, [value])

  const r = 42
  const c = 2 * Math.PI * r
  const off = c * (1 - shown / 100)
  const color = memColor(value)

  return (
    <div className="relative w-[128px] h-[128px] shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--card-alt)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.23,1,0.32,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[30px] font-bold text-[var(--ink)] leading-none">
          <NumberFlow value={value} />%
        </span>
        <span className="text-[11px] font-bold text-[var(--muted)] mt-1">memory</span>
      </div>
    </div>
  )
}

// ── stat tile ───────────────────────────────────────────────────────────────
function StatTile({ icon, iconColor, value, label }) {
  return (
    <div className="bg-[var(--card)] rounded-3xl p-3.5 border border-[var(--border)] shadow-sm flex flex-col items-center text-center">
      <HugeiconsIcon icon={icon} size={22} strokeWidth={1.8} color={iconColor} />
      <p className="text-[22px] font-bold text-[var(--ink)] leading-none mt-2">
        <NumberFlow value={value} />
      </p>
      <p className="text-[11px] font-bold text-[var(--muted)] mt-1">{label}</p>
    </div>
  )
}

// ── activity heatmap ────────────────────────────────────────────────────────
const HEAT_WEEKS = 18

function heatColor(count, future) {
  if (future) return 'transparent'
  if (count <= 0) return 'var(--card-alt)'
  if (count === 1) return 'hsla(160,84%,39%,0.35)'
  if (count === 2) return 'hsla(160,84%,39%,0.6)'
  if (count === 3) return 'hsla(160,84%,39%,0.8)'
  return EMERALD
}

function ActivityHeatmap({ byDay }) {
  const cells = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // End the grid on the Saturday of the current week so columns are whole weeks.
    const end = new Date(today)
    end.setDate(end.getDate() + (6 - end.getDay()))
    const out = []
    for (let i = HEAT_WEEKS * 7 - 1; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(end.getDate() - i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      out.push({ iso, count: byDay[iso] || 0, future: d > today })
    }
    return out
  }, [byDay])

  return (
    <div
      className="grid gap-[3px]"
      style={{
        gridTemplateColumns: `repeat(${HEAT_WEEKS}, 1fr)`,
        gridTemplateRows: 'repeat(7, 1fr)',
        gridAutoFlow: 'column'
      }}
    >
      {cells.map(({ iso, count, future }) => (
        <div
          key={iso}
          className="aspect-square rounded-[2.5px]"
          style={{ backgroundColor: heatColor(count, future) }}
          title={future ? '' : `${iso}: ${count} revision${count === 1 ? '' : 's'}`}
        />
      ))}
    </div>
  )
}

function HeatLegend() {
  const steps = ['var(--card-alt)', 'hsla(160,84%,39%,0.35)', 'hsla(160,84%,39%,0.6)', 'hsla(160,84%,39%,0.8)', EMERALD]
  return (
    <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] font-bold text-[var(--muted)]">
      <span>Less</span>
      {steps.map((c, i) => (
        <span key={i} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
      ))}
      <span>More</span>
    </div>
  )
}

// ── section wrapper ─────────────────────────────────────────────────────────
function Card({ children, delay = 0, className = '' }) {
  return (
    <div
      className={`bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm animate-enter ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <AppShell nav><div className="px-5 pt-6 pb-4">
      <div className="max-w-sm mx-auto">
        <div className="h-7 w-32 rounded-full bg-[var(--card-alt)] animate-pulse mb-2" />
        <div className="h-4 w-56 rounded-full bg-[var(--card-alt)] animate-pulse mb-5" />
        <div className="h-32 rounded-3xl bg-[var(--card-alt)] animate-pulse mb-3" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-3xl bg-[var(--card-alt)] animate-pulse" />)}
        </div>
        <div className="h-40 rounded-3xl bg-[var(--card-alt)] animate-pulse" />
      </div>
    </div></AppShell>
  )
}

export default function Progress() {
  const { student, loading: studentLoading } = useStudentProfile()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    supabase
      .from('topics')
      .select('id, subject, revisions(id, scheduled_date, interval_label, completed, completed_at, recall_quality)')
      .eq('student_id', student.id)
      .not('archived', 'is', true)
      .then(({ data, error }) => {
        if (error) console.error(error)
        setTopics(data || [])
        setLoading(false)
      })
  }, [student])

  if (studentLoading || loading) return <ProgressSkeleton />

  // ── derive everything from the revision rows we already store ──────────────
  const byDay = completedByDay(topics)
  const totalDone = Object.values(byDay).reduce((a, b) => a + b, 0)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
  const weekAgoISO = weekAgo.toISOString().slice(0, 10)
  const thisWeek = Object.entries(byDay)
    .filter(([d]) => d >= weekAgoISO && d <= todayISO())
    .reduce((a, [, n]) => a + n, 0)

  const memories = topics.map(t => computeMemory(t.revisions || [])).filter(m => m != null)
  const avgMemory = memories.length ? Math.round(memories.reduce((a, b) => a + b, 0) / memories.length) : 0
  const onTrackCount = topics.filter(t => (t.revisions || []).length && isOnTrack(t.revisions || [])).length

  // Best streak = the stored high-water mark, floored by what we can still see in
  // the revision history — so it's right even before the migration backfills.
  const best = Math.max(student?.longest_streak || 0, longestStreak(activeDates(topics)))
  const recall = recallBreakdown(topics)
  const subjects = memoryBySubject(topics)

  const memLabel = memories.length === 0 ? 'No revisions yet'
    : avgMemory >= 67 ? 'Strong recall'
    : avgMemory >= 40 ? 'Fair — keep going'
    : 'Time to revise'

  const streakLine = (student?.current_streak || 0) > 0
    ? <>You're on a <b className="text-[var(--ink)]">{student.current_streak}-day streak</b> — here's the bigger picture.</>
    : <>Complete revisions to build your streak and grow your memory.</>

  // Empty state — no topics at all.
  if (topics.length === 0) {
    return (
      <AppShell nav><div className="px-5 pt-6 pb-4">
        <div className="max-w-sm mx-auto">
          <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mb-5">Progress</h1>
          <Card className="py-14 text-center px-6">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-[16px] font-bold text-[var(--ink)]">No progress yet</p>
            <p className="text-[13px] text-[var(--muted)] mt-1 mb-5">
              Add a topic and complete your first revision to watch your memory grow.
            </p>
            <Link
              to="/add-topic"
              className="inline-block px-5 py-2.5 rounded-2xl bg-brand-500 text-white text-[14px] font-bold active:scale-95 transition-transform"
            >
              Add a topic
            </Link>
          </Card>
        </div>
      </div></AppShell>
    )
  }

  const RECALL_SEGMENTS = [
    { key: 'good', label: 'Good', color: EMERALD },
    { key: 'okay', label: 'Okay', color: AMBER },
    { key: 'struggled', label: 'Struggled', color: RED }
  ]

  return (
    <AppShell nav><div className="px-5 pt-6 pb-4">
      <div className="max-w-sm mx-auto">
        <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight leading-tight">Progress</h1>
        <p className="text-[14px] text-[var(--muted)] mt-1 mb-5">{streakLine}</p>

        {/* Memory strength hero */}
        <Card delay={0} className="p-5 flex items-center gap-4 mb-3">
          <MemoryRing value={avgMemory} />
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wide">Memory strength</p>
            <p className="text-[19px] font-bold leading-tight mt-0.5" style={{ color: memColor(memories.length ? avgMemory : null) }}>
              {memLabel}
            </p>
            <p className="text-[12.5px] text-[var(--slate-txt)] mt-1.5 font-semibold">
              {topics.length} topic{topics.length === 1 ? '' : 's'} · {onTrackCount} on track
            </p>
          </div>
        </Card>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="animate-enter" style={{ animationDelay: '45ms' }}>
            <StatTile icon={Fire02Icon} iconColor={AMBER} value={student?.current_streak || 0} label="Day streak" />
          </div>
          <div className="animate-enter" style={{ animationDelay: '90ms' }}>
            <StatTile icon={ChampionIcon} iconColor={EMERALD} value={best} label="Best streak" />
          </div>
          <div className="animate-enter" style={{ animationDelay: '135ms' }}>
            <StatTile icon={Diamond02Icon} iconColor={BRAND} value={student?.gems || 0} label="Gems" />
          </div>
        </div>

        {/* Consistency / activity heatmap */}
        <Card delay={180} className="p-5 mb-3">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-[15px] font-bold text-[var(--ink)]">Consistency</p>
              <p className="text-[12px] text-[var(--muted)] font-semibold mt-0.5">
                <b className="text-[var(--slate-txt)]"><NumberFlow value={totalDone} /></b> done ·{' '}
                <b className="text-[var(--slate-txt)]"><NumberFlow value={thisWeek} /></b> this week
              </p>
            </div>
            <span className="text-[11px] font-bold text-[var(--muted)]">18 wks</span>
          </div>
          <ActivityHeatmap byDay={byDay} />
          <HeatLegend />
        </Card>

        {/* Recall quality */}
        {recall.total > 0 && (
          <Card delay={225} className="p-5 mb-3">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[15px] font-bold text-[var(--ink)]">Recall quality</p>
              <span className="text-[12px] font-bold text-[var(--muted)]">
                <NumberFlow value={recall.total} /> graded
              </span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-[var(--card-alt)]">
              {RECALL_SEGMENTS.map(s => {
                const pct = (recall[s.key] / recall.total) * 100
                if (pct === 0) return null
                return <div key={s.key} style={{ width: `${pct}%`, backgroundColor: s.color }} />
              })}
            </div>
            <div className="flex items-center justify-between mt-3">
              {RECALL_SEGMENTS.map(s => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[12px] font-bold text-[var(--slate-txt)]">{s.label}</span>
                  <span className="text-[12px] font-bold text-[var(--muted)]">{recall[s.key]}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Memory by subject */}
        {subjects.length > 0 && (
          <Card delay={270} className="p-5">
            <p className="text-[15px] font-bold text-[var(--ink)] mb-4">Memory by subject</p>
            <div className="space-y-3.5">
              {subjects.map(s => (
                <div key={s.subject}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-[13px] font-bold text-[var(--slate-txt)] truncate pr-2">
                      {s.subject} <span className="text-[var(--muted)] font-semibold">· {s.count}</span>
                    </p>
                    <p className="text-[13px] font-bold shrink-0" style={{ color: memColor(s.memory) }}>{s.memory}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--card-alt)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, s.memory)}%`, backgroundColor: memColor(s.memory), transition: 'width 700ms cubic-bezier(0.23,1,0.32,1)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-[11px] text-[var(--muted)] text-center mt-6 px-6">
          Memory % is an estimate from the forgetting curve — revise on schedule to keep it high.
        </p>
      </div>
    </div></AppShell>
  )
}
