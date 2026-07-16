import { useEffect, useState } from 'react'
import { initNotifications } from '../lib/notifications'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import NumberFlow from '@number-flow/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Fire02Icon, Diamond02Icon, Notification01Icon, Flag02Icon } from '@hugeicons/core-free-icons'
import BrandLogo from '../lib/BrandLogo'
import WeekStrip from '../lib/WeekStrip'
import StreakSheet from '../lib/StreakSheet'
import GemsSheet from '../lib/GemsSheet'
import ForecastSheet from '../lib/ForecastSheet'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useStudentProfile } from '../lib/useStudentProfile'
import { applyPendingShare } from '../lib/sharing'
import AppShell from '../lib/AppShell'
import LottieEmpty from '../lib/LottieEmpty'
import allDoneAnim from '../assets/lottie/all-done.lottie?url'
import {
  summarize, completion, computeMemory, isOnTrack, nextRevision
} from '../lib/metrics'
import { forecastCard, forecastBySubject } from '../lib/forecast'
import { receiptStats } from '../lib/receipt'
import { daysUntilExam } from '../lib/schedule'

const TAB_LABELS = { due: 'Due Today', missed: 'To review', upcoming: 'Upcoming' }
// Active-tab colour per bucket: green = on time, orange = behind (a nudge, not
// an alarm), blue = ahead (theme brand).
const TAB_ACTIVE_BG = { due: 'bg-emerald-500', missed: 'bg-orange-500', upcoming: 'bg-brand-500' }

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}
const todayISO = () => new Date().toISOString().slice(0, 10)
function shortDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
function longDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
function initials(name) {
  if (!name) return 'SR'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

function HomeSkeleton() {
  return (
    <AppShell nav><div className="px-5 pt-6 pb-4">
      <div className="max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-32 rounded-full bg-[var(--card-alt)] animate-pulse" />
          <div className="h-9 w-28 rounded-2xl bg-[var(--card-alt)] animate-pulse" />
        </div>
        <div className="h-8 w-48 rounded-full bg-[var(--card-alt)] animate-pulse mb-2" />
        <div className="h-4 w-64 rounded-full bg-[var(--card-alt)] animate-pulse mb-6" />
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)]">
              <div className="h-4 w-32 rounded-full bg-[var(--card-alt)] animate-pulse mb-3" />
              <div className="h-2 w-full rounded-full bg-[var(--card-alt)] animate-pulse mb-3" />
              <div className="h-3 w-40 rounded-full bg-[var(--card-alt)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div></AppShell>
  )
}

// Same 67/40 bands the memory% stat uses: green = holding, amber = fading,
// red = revise me. Low is a nudge, never a verdict.
const toneText = m => (m >= 67 ? 'text-emerald-600' : m >= 40 ? 'text-amber-600' : 'text-red-500')
const toneBar = m => (m >= 67 ? 'bg-emerald-500' : m >= 40 ? 'bg-amber-500' : 'bg-red-500')

function examKicker(daysLeft, examISO) {
  const when = daysLeft === 0 ? 'Exam today' : daysLeft === 1 ? 'Exam tomorrow' : `Exam in ${daysLeft} days`
  return `${when} · ${shortDate(examISO)}`
}

// The Memory Forecast hero: where you're headed on exam day, and what today's
// session is worth. All numbers come from forecastCard() — this just renders
// its states. The % is deliberately "~" and capped at 90+ so the model never
// over-promises. After the exam it becomes the receipt moment (`recap` is the
// student's saved tagging, or null). Exported for the harness.
export function ForecastCard({ topics, examDate, onToday, onOpen, recap }) {
  const card = forecastCard(topics, examDate)
  if (card.state === 'hidden') return null

  const shell = 'bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)] shadow-sm mb-4 animate-enter'

  if (card.state === 'post-exam') {
    if (recap) {
      const stats = receiptStats(topics, recap.appeared_topic_ids)
      return (
        <Link to="/exam-recap" className={`block ${shell} active:scale-[0.98] transition-transform`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Your exam receipt 🧾</p>
          <p className="text-[15px] font-bold text-[var(--ink)] mt-1">
            <span className="text-emerald-600">{stats.revised} of {stats.appeared}</span> topics on your paper — already revised
          </p>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">Tap to see or share it.</p>
        </Link>
      )
    }
    return (
      <Link to="/exam-recap" className={`block ${shell} active:scale-[0.98] transition-transform`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Exam done 🧾</p>
        <p className="text-[15px] font-bold text-[var(--ink)] mt-1">
          How did it go? <span className="text-brand-500">Tag what came up →</span>
        </p>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">We'll show you how ready you were.</p>
      </Link>
    )
  }

  if (card.state === 'no-exam') {
    return (
      <Link to="/settings/study-plan" className={`block ${shell} active:scale-[0.98] transition-transform`}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Memory forecast</p>
        <p className="text-[15px] font-bold text-[var(--ink)] mt-1">
          When's your exam? <span className="text-brand-500">Set the date →</span>
        </p>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">See how much you'll remember on exam day.</p>
      </Link>
    )
  }

  if (card.state === 'locked') {
    return (
      <div className={shell}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{examKicker(card.daysLeft, examDate)}</p>
        <p className="text-[13px] text-[var(--slate-txt)] mt-1">
          Revise <b className="text-[var(--ink)]">{card.needed} more topic{card.needed > 1 ? 's' : ''}</b> to unlock your memory forecast.
        </p>
      </div>
    )
  }

  const capped = card.planned > 90
  // Today's reps only get the headline when they truly move the number;
  // otherwise the keep-vs-stop gap is the honest motivator.
  const showToday = card.today && card.today.count > 0 && card.today.delta >= 3
  const showGap = !showToday && card.ifStopped != null && card.planned - card.ifStopped >= 5
  // Final week: surface the per-subject triage right on the card, weakest first.
  const subjects = card.daysLeft <= 7
    ? forecastBySubject(topics, examDate).filter(s => s.planned != null).slice(0, 4)
    : []

  return (
    <div className={`${shell} cursor-pointer active:scale-[0.99] transition-transform`} onClick={onOpen}>
      <div className="flex justify-between items-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{examKicker(card.daysLeft, examDate)}</p>
        <span className="text-[11px] font-bold text-[var(--muted)]">Details ›</span>
      </div>
      <p className={`text-[32px] font-bold tracking-tight leading-none mt-1.5 ${toneText(card.planned)}`}>
        ~<NumberFlow value={Math.min(card.planned, 90)} />%{capped ? '+' : ''}
        <span className="text-[13px] font-semibold text-[var(--muted)] tracking-normal ml-2">you'll remember on exam day</span>
      </p>
      {showToday ? (
        <button type="button" onClick={e => { e.stopPropagation(); onToday() }} className="mt-2 text-[12.5px] font-bold text-brand-500 active:opacity-70">
          Today's {card.today.count} revision{card.today.count > 1 ? 's' : ''} → +{card.today.delta}% ↗
        </button>
      ) : showGap ? (
        <p className="mt-2 text-[12.5px] text-[var(--muted)]">
          If you stop revising now, this drops to <b className="text-[var(--slate-txt)]">~{card.ifStopped}%</b>.
        </p>
      ) : (
        <p className="mt-2 text-[12.5px] text-[var(--muted)]">Keep revising to stay here.</p>
      )}
      {subjects.length > 0 && (
        <div className="mt-3 space-y-2">
          {subjects.map(s => (
            <div key={s.subject} className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--slate-txt)] w-20 truncate shrink-0">{s.subject}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--card-alt)] overflow-hidden">
                <div className={`h-full rounded-full ${toneBar(s.planned)}`} style={{ width: `${Math.min(s.planned, 100)}%` }} />
              </div>
              <span className={`text-[11px] font-bold w-8 text-right ${toneText(s.planned)}`}>{s.planned}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineCard({ topic, i }) {
  const revs = [...(topic.revisions || [])].sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1))
  const { done, total } = completion(revs)
  const memory = computeMemory(revs)
  const onTrack = isOnTrack(revs)
  const next = nextRevision(revs)
  // Future revisions stay locked — revising early defeats the spacing interval.
  const nextIsLocked = next && next.scheduled_date > todayISO()
  // Colour the memory % so a low score reads as "revise me", not failure.
  // ~37% is the forgetting-curve point where a revision is due.
  const memTone = memory == null ? 'text-[var(--slate-txt)]' : toneText(memory)

  return (
    <div
      className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)] shadow-sm animate-enter"
      style={{ animationDelay: `${i * 45}ms` }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--card-alt)] text-[var(--slate-txt)]">
          {topic.subject || 'General'}
        </span>
        {topic.date_learned && (
          <span className="text-[11px] text-[var(--muted)]">Started on <b className="text-[var(--slate-txt)]">{longDate(topic.date_learned)}</b></span>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <Link to={`/topic/${topic.id}`} className="text-[19px] font-bold text-[var(--ink)] tracking-tight leading-tight">
          {topic.topic_name}
        </Link>
        {next && (nextIsLocked ? (
          <span className="shrink-0 px-4 py-2 rounded-2xl bg-[var(--card-alt)] text-[var(--muted)] text-[13px] font-bold">
            Unlocks {shortDate(next.scheduled_date)}
          </span>
        ) : (
          <Link
            to={`/revise/${next.id}`}
            className="shrink-0 px-4 py-2 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-95 transition-transform"
          >
            Revise
          </Link>
        ))}
      </div>

      {/* 5-stage revision timeline */}
      <div className="flex items-start gap-1.5 mb-4">
        {revs.map((r, idx) => {
          const isToday = r.scheduled_date === todayISO()
          return (
            <div key={r.id} className="flex-1 min-w-0">
              <div
                className="h-2 rounded-full"
                style={{ backgroundColor: r.completed ? 'var(--ink)' : 'var(--card-alt)' }}
              />
              <p className="mt-1.5 text-[9px] leading-tight text-[var(--slate-txt)] truncate">
                {isToday ? 'Today' : shortDate(r.scheduled_date)}
              </p>
              <p className="text-[9px] leading-tight text-[var(--muted)]">{ordinal(idx + 1)} Rev</p>
            </div>
          )
        })}
        <HugeiconsIcon icon={Flag02Icon} size={16} strokeWidth={2} className="text-[var(--slate-txt)] mt-0.5 shrink-0" aria-hidden />
      </div>

      {/* stats */}
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] font-bold">
        <span className="text-[var(--slate-txt)]">{done}/{total} <span className="text-[var(--muted)] font-semibold">Done</span></span>
        <span className={memTone}>
          {memory == null ? 'New' : `${memory}%`} <span className="text-[var(--muted)] font-semibold">Memory</span>
        </span>
        <span className={`ml-auto ${onTrack ? 'text-emerald-600' : 'text-orange-600'}`}>
          {onTrack ? 'On track' : 'Behind'}
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { student, loading: studentLoading, refreshStudent } = useStudentProfile()
  const navigate = useNavigate()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('due')
  const [streakOpen, setStreakOpen] = useState(false)
  const [gemsOpen, setGemsOpen] = useState(false)
  const [forecastOpen, setForecastOpen] = useState(false)
  const [recap, setRecap] = useState(null)

  // Just after the exam, the forecast card becomes the receipt moment — it
  // needs to know whether this exam's tagging already exists.
  useEffect(() => {
    if (!student?.exam_date) return
    const left = daysUntilExam(student.exam_date)
    if (left == null || left >= 0 || left < -14) return
    supabase
      .from('exam_recaps')
      .select('appeared_topic_ids')
      .eq('student_id', student.id)
      .eq('exam_date', student.exam_date)
      .maybeSingle()
      .then(({ data }) => setRecap(data))
  }, [student])

  useEffect(() => {
    if (!student) return
    loadTopics()
  }, [student])

  useEffect(() => {
    if (user) initNotifications(user.id)
  }, [user])

  // One-time explainer so a new student knows what the 💎 gem counter means.
  useEffect(() => {
    if (!student) return
    if (localStorage.getItem('sr_gems_explained')) return
    const t = setTimeout(() => {
      toast('💎 Meet Gems', { description: 'Earn gems every time you complete a revision — more for staying on time. Tap the icons anytime to recap.' })
      localStorage.setItem('sr_gems_explained', '1')
    }, 1400)
    return () => clearTimeout(t)
  }, [student])

  // Finish a pending "Save to my revisions" flow after a shared-link signup.
  useEffect(() => {
    if (!user || !student) return
    if (!localStorage.getItem('sr_pending_share')) return
    applyPendingShare(user, student).then(newId => {
      if (newId) {
        toast.success('Saved to your revisions 🎉')
        navigate(`/topic/${newId}`)
      }
    })
  }, [user, student])

  async function loadTopics() {
    const { data, error } = await supabase
      .from('topics')
      .select('id, subject, topic_name, date_learned, priority, revisions(id, scheduled_date, interval_label, completed, completed_at, recall_quality)')
      .eq('student_id', student.id)
      .not('archived', 'is', true)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setTopics(data || [])
    setLoading(false)
  }

  if (studentLoading || loading) return <HomeSkeleton />

  const { buckets, counts } = summarize(topics)
  const list = buckets[tab]

  // Lead with the achievable action; behind-schedule items live (softly) in
  // their own tab, and become a positive, tappable nudge when nothing's due today.
  let summaryNode
  if (counts.due > 0) {
    summaryNode = <>You've got <b className="text-[var(--ink)]">{counts.due} revision{counts.due > 1 ? 's' : ''}</b> to revise today — steady wins the streak. 💪</>
  } else if (counts.missed > 0) {
    summaryNode = <>Nothing due today — a good moment to{' '}
      <button onClick={() => setTab('missed')} className="text-brand-500 font-bold underline underline-offset-2 active:opacity-70">review {counts.missed}</button>.
    </>
  } else if (counts.upcoming > 0) {
    summaryNode = <>All caught up — nothing due today. 🎉</>
  } else {
    summaryNode = "You're all caught up — add a topic to get started."
  }

  const emptyCopy = {
    due: { emoji: '🎉', text: 'Nothing due today' },
    missed: { emoji: '✅', text: 'Nothing to review — nice!' },
    upcoming: { emoji: '📭', text: 'Nothing scheduled ahead' }
  }[tab]

  // Did they actually clear today's work (vs nothing having been due)? Only then
  // is the empty "Due Today" tab a celebration worth animating.
  const clearedDueToday = topics.some(t =>
    (t.revisions || []).some(r => r.scheduled_date === todayISO() && r.completed)
  )

  return (
    <AppShell nav><div className="px-5 pt-6 pb-4">
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <BrandLogo />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStreakOpen(true)}
              className="flex items-center gap-1 text-[15px] font-bold text-amber-500 active:opacity-70 transition-opacity"
            >
              <HugeiconsIcon icon={Fire02Icon} size={20} strokeWidth={1.5} color="#f59e0b" className="[&_path]:fill-[#f59e0b]" />
              <NumberFlow value={student?.current_streak || 0} />
            </button>
            <button
              type="button"
              onClick={() => setGemsOpen(true)}
              className="flex items-center gap-1 text-[15px] font-bold text-brand-500 active:opacity-70 transition-opacity"
            >
              <HugeiconsIcon icon={Diamond02Icon} size={20} strokeWidth={1.5} color="#ffffff" className="[&_path]:fill-[hsl(213,96%,56%)]" />
              <NumberFlow value={student?.gems || 0} />
            </button>
            <Link to="/settings/notifications" aria-label="Notifications" className="text-[var(--slate-txt)] active:scale-90 transition-transform">
              <HugeiconsIcon icon={Notification01Icon} size={22} strokeWidth={2} />
            </Link>
            <Link
              to="/settings"
              className="w-9 h-9 rounded-full bg-brand-500 text-white text-[12px] font-bold flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Settings"
            >
              {initials(student?.name)}
            </Link>
          </div>
        </div>

        {/* Greeting + summary */}
        <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight leading-tight">
          {greeting()}, {student?.name?.split(' ')[0] || 'there'} <span className="wave-hand" aria-hidden>👋</span>
        </h1>
        <p className="text-[14px] text-[var(--muted)] mt-1 mb-4">{summaryNode}</p>

        {/* Memory forecast hero */}
        <ForecastCard
          topics={topics}
          examDate={student?.exam_date}
          onToday={() => setTab(counts.due > 0 ? 'due' : 'missed')}
          onOpen={() => setForecastOpen(true)}
          recap={recap}
        />

        {/* Calendar week strip */}
        <WeekStrip topics={topics} studyDays={student?.study_days} />

        {/* Tabs */}
        <div className="flex items-center gap-1.5 mb-4">
          {['due', 'missed', 'upcoming'].map(t => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                  active ? `${TAB_ACTIVE_BG[t]} text-white` : 'text-[var(--muted)]'
                }`}
              >
                {TAB_LABELS[t]}
                <span className={`min-w-5 px-1.5 py-0.5 rounded-full text-[11px] leading-none ${active ? 'bg-white/25' : 'bg-[var(--card-alt)] text-[var(--slate-txt)]'}`}>
                  {counts[t]}
                </span>
              </button>
            )
          })}
        </div>

        {/* List */}
        {list.length === 0 ? (
          tab === 'due' && clearedDueToday ? (
            <div className="py-10 text-center">
              <LottieEmpty src={allDoneAnim} size={160} />
              <p className="text-[16px] font-bold text-[var(--ink)] mt-1">All done for today!</p>
              <p className="text-[13px] text-[var(--muted)] mt-1">You've cleared every revision due today. See you tomorrow. 👋</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] py-12 text-center">
              <p className="text-3xl mb-2">{emptyCopy.emoji}</p>
              <p className="text-[15px] text-[var(--muted)]">{emptyCopy.text}</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {list.map((t, i) => <TimelineCard key={t.id} topic={t} i={i} />)}
          </div>
        )}
      </div>

      <StreakSheet open={streakOpen} onClose={() => setStreakOpen(false)} student={student} topics={topics} onChanged={refreshStudent} />
      <GemsSheet open={gemsOpen} onClose={() => setGemsOpen(false)} student={student} />
      <ForecastSheet open={forecastOpen} onClose={() => setForecastOpen(false)} topics={topics} examDate={student?.exam_date} />
    </div></AppShell>
  )
}
