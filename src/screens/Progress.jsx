import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberFlow from '@number-flow/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Fire02Icon, Diamond02Icon, ChampionIcon } from '@hugeicons/core-free-icons'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import AppShell from '../lib/AppShell'
import LottieEmpty from '../lib/LottieEmpty'
import progressAnim from '../assets/lottie/progress.lottie?url'
import {
  computeMemory, isOnTrack, activeDates, longestStreak,
  completedByDay, recallBreakdown, memoryBySubject, studyBalance
} from '../engine/metrics'

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

// ── study balance ───────────────────────────────────────────────────────────
const BAND_META = {
  balanced:   { color: EMERALD, label: 'Balanced',   pill: 'Healthy pace — keep it up',    emoji: '🌿' },
  busy:       { color: AMBER,   label: 'Busy',        pill: 'Busy stretch — pace yourself', emoji: '⚡' },
  overloaded: { color: RED,     label: 'Overloaded',  pill: 'Backlog is piling up',         emoji: '💙' }
}

// A short, specific, gentle line — leads with whichever signal is loudest.
function balanceInsight(b) {
  if (b.band === 'overloaded') {
    if (b.overdue > 0)
      return <>You've got <b className="text-[var(--ink)]">{b.overdue} topic{b.overdue === 1 ? '' : 's'} overdue</b> and a heavy stretch behind you. Clear a few tomorrow morning — and it's okay to <b className="text-[var(--ink)]">use a streak freeze</b> tonight.</>
    return <>That's a lot of reviewing packed into short bursts. Spreading it out sticks better — and goes easier on you.</>
  }
  if (b.band === 'busy') {
    if (b.lateNight >= 3)
      return <>You've revised late <b className="text-[var(--ink)]">{b.lateNight} nights</b> this week. Try shifting a session to the morning — recall is stronger on rest.</>
    if (b.overdue > 0)
      return <>A few topics are slipping — <b className="text-[var(--ink)]">{b.overdue} overdue</b>. Knock those out first and you're back in the green.</>
    return <>A full week, but nothing's out of hand. Keep an eye on the backlog.</>
  }
  if (b.overdue === 0)
    return <>Your load is spread nicely and <b className="text-[var(--ink)]">nothing's overdue</b> — you're revising right on schedule.</>
  return <>You're keeping a steady, sustainable pace. Nice work.</>
}

function FactorRow({ label, value, color, children }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-[var(--border)] last:border-none">
      <span className="w-[18px] shrink-0 text-[var(--slate-txt)]">{children}</span>
      <span className="text-[13px] font-bold text-[var(--slate-txt)] flex-1">{label}</span>
      <span className="text-[13px] font-bold shrink-0" style={{ color }}>{value}</span>
    </div>
  )
}

const HeartIcon = ({ color }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
)

function BalanceCard({ balance, delay }) {
  const meta = BAND_META[balance.band]
  const load = Math.max(6, 100 - balance.score) // sliver even when perfectly balanced
  const b = balance

  const overdueColor = b.overdue === 0 ? EMERALD : b.overdue >= 5 ? RED : AMBER
  const lateColor = b.lateNight >= 5 ? RED : b.lateNight >= 3 ? AMBER : 'var(--slate-txt)'
  const busiestColor = b.busiest.count >= 12 ? RED : b.busiest.count >= 9 ? AMBER : 'var(--slate-txt)'

  return (
    <Card delay={delay} className="p-5 mb-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <HeartIcon color={meta.color} />
          <p className="text-[15px] font-bold text-[var(--ink)]">Study Balance</p>
        </div>
        <div className="text-right">
          <p className="text-[23px] font-bold leading-none" style={{ color: meta.color }}>
            <NumberFlow value={b.score} />
          </p>
          <p className="text-[10.5px] font-bold uppercase tracking-wide mt-1" style={{ color: meta.color }}>{meta.label}</p>
        </div>
      </div>

      {/* Load meter — tri-colour track, fill grows with strain */}
      <div
        className="relative h-[11px] rounded-full overflow-hidden"
        style={{ background: 'linear-gradient(90deg, hsl(160,55%,19%) 0%, hsl(160,48%,17%) 33%, hsl(38,58%,21%) 34%, hsl(38,52%,19%) 66%, hsl(0,52%,23%) 67%, hsl(0,48%,21%) 100%)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${load}%`, backgroundColor: meta.color, transition: 'width 800ms cubic-bezier(0.23,1,0.32,1)' }}
        />
      </div>
      <div className="flex justify-between mt-2.5">
        {['balanced', 'busy', 'overloaded'].map(k => (
          <span
            key={k}
            className="text-[11px] font-bold"
            style={{ color: k === b.band ? BAND_META[k].color : 'var(--muted)' }}
          >
            {BAND_META[k].label}
          </span>
        ))}
      </div>

      <div
        className="inline-flex items-center gap-2 mt-4 px-3.5 py-2 rounded-full text-[13px] font-bold"
        style={{ backgroundColor: `${meta.color.replace(')', ',0.14)').replace('hsl', 'hsla')}`, color: meta.color }}
      >
        <span className="text-[15px] leading-none">{meta.emoji}</span>
        {meta.pill}
      </div>

      {/* Contributing signals — the actual numbers */}
      <div className="mt-4 border-t border-[var(--border)] pt-1">
        <FactorRow label="Overdue backlog" value={`${b.overdue} topic${b.overdue === 1 ? '' : 's'}`} color={overdueColor}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
        </FactorRow>
        <FactorRow label="Late-night reviews" value={`${b.lateNight} this week`} color={lateColor}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        </FactorRow>
        <FactorRow
          label="Busiest day"
          value={b.busiest.day ? `${b.busiest.count} · ${b.busiest.day}` : '—'}
          color={busiestColor}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
        </FactorRow>
      </div>

      <div className="mt-4 bg-[var(--card-alt)] rounded-2xl p-3.5 flex gap-2.5 items-start">
        <span className="text-[17px] leading-tight">{meta.emoji}</span>
        <p className="text-[12.5px] font-semibold text-[var(--slate-txt)] leading-relaxed">{balanceInsight(b)}</p>
      </div>
    </Card>
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
  const balance = studyBalance(topics)

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
          <div className="py-14 text-center px-6 animate-enter">
            <LottieEmpty src={progressAnim} size={140} className="mb-3" />
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
          </div>
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

        {/* Study balance — sustainability of pace (hidden until there's real load) */}
        {balance && <BalanceCard balance={balance} delay={205} />}

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
