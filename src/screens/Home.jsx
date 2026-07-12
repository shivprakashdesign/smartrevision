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

function TimelineCard({ topic, i }) {
  const revs = [...(topic.revisions || [])].sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1))
  const { done, total } = completion(revs)
  const memory = computeMemory(revs)
  const onTrack = isOnTrack(revs)
  const next = nextRevision(revs)
  // Colour the memory % so a low score reads as "revise me", not failure.
  // ~37% is the forgetting-curve point where a revision is due.
  const memTone = memory == null ? 'text-[var(--slate-txt)]'
    : memory >= 67 ? 'text-emerald-600'
    : memory >= 40 ? 'text-amber-600'
    : 'text-red-500'

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
        {next && (
          <Link
            to={`/revise/${next.id}`}
            className="shrink-0 px-4 py-2 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-95 transition-transform"
          >
            Revise
          </Link>
        )}
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
        <p className="text-[14px] text-[var(--muted)] mt-1 mb-5">{summaryNode}</p>

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
    </div></AppShell>
  )
}
