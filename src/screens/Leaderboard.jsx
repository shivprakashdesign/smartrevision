import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../lib/AppShell'
import LottieEmpty from '../lib/LottieEmpty'
import leaderboardAnim from '../assets/lottie/leaderboard.lottie?url'
import NumberFlow from '@number-flow/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Diamond02Icon } from '@hugeicons/core-free-icons'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'

// Medal tints for the rank badge: gold / silver / bronze, then "iron" for the rest.
const MEDAL = {
  1: { bg: 'rgba(245,158,11,0.18)', color: '#B45309' },
  2: { bg: 'rgba(100,116,139,0.20)', color: '#475569' },
  3: { bg: 'rgba(234,88,12,0.16)', color: '#C2410C' }
}

function RankBadge({ rank }) {
  const s = MEDAL[rank] || { bg: 'var(--card-alt)', color: 'var(--muted)' }
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {rank}
    </div>
  )
}

function Avatar({ name, you }) {
  const letter = (name || '?').trim()[0]?.toUpperCase() || '?'
  return (
    <div
      className="w-11 h-11 rounded-2xl flex items-center justify-center text-[17px] font-bold shrink-0"
      style={you
        ? { backgroundColor: 'hsl(213,90%,48%)', color: '#fff' }
        : { backgroundColor: 'var(--card-alt)', color: 'var(--slate-txt)' }}
    >
      {letter}
    </div>
  )
}

function Row({ r, you }) {
  return (
    <div className={`flex items-center gap-3 rounded-3xl p-3 shadow-sm ${
      you ? 'border-2 border-emerald-500 bg-emerald-500/[0.07]' : 'bg-[var(--card)] border border-[var(--border)]'
    }`}>
      <RankBadge rank={Number(r.rank)} />
      <Avatar name={r.name} you={you} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold truncate leading-tight">
          <span className={you ? 'text-emerald-600' : 'text-[var(--ink)]'}>{r.name}</span>
          {you && <span className="text-[var(--muted)] font-semibold"> (You)</span>}
        </p>
        {r.current_streak > 0 && (
          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-alt)] text-[var(--slate-txt)]">
            🔥 {r.current_streak}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 text-brand-500 font-bold text-[15px]">
        <HugeiconsIcon icon={Diamond02Icon} size={17} strokeWidth={1.5} color="#ffffff" className="[&_path]:fill-[hsl(213,96%,56%)]" />
        <NumberFlow value={r.gems ?? 0} />
      </div>
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <AppShell nav><div className="px-5 pt-6"><div className="max-w-sm mx-auto">
      <div className="h-8 w-52 rounded-full bg-[var(--card-alt)] animate-pulse mb-6" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-[68px] rounded-3xl bg-[var(--card-alt)] animate-pulse" />)}
      </div>
    </div></div></AppShell>
  )
}

export default function Leaderboard() {
  const { student, loading: studentLoading } = useStudentProfile()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    loadLeaderboard()
  }, [student])

  async function loadLeaderboard() {
    if (!student.class_id) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase.rpc('get_leaderboard', { class_id_param: student.class_id })
    if (error) console.error(error)
    setRows(data || [])
    setLoading(false)
  }

  if (studentLoading || loading) return <LeaderboardSkeleton />

  const me = rows.find(r => r.student_id === student.id)
  // You always live in the pinned card below, so keep yourself out of the scrolling list.
  const others = rows.filter(r => r.student_id !== student.id)

  return (
    <AppShell nav>
      <div className="px-5 pt-6">
        <div className="max-w-sm mx-auto">
          <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mb-6">Class leaderboard</h1>

          {!student.class_id ? (
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] py-12 px-6 text-center">
              <p className="text-3xl mb-2">🏫</p>
              <p className="text-[15px] text-[var(--muted)] mb-4">You're not in a class yet.</p>
              <Link to="/settings/study-plan"
                className="inline-block px-5 py-2.5 rounded-2xl bg-brand-500 text-white text-[14px] font-bold active:scale-[0.97] transition-transform">
                Pick your school
              </Link>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] py-12 text-center">
              <LottieEmpty src={leaderboardAnim} size={140} className="mb-2" />
              <p className="text-[15px] text-[var(--muted)]">No rankings yet — start revising to earn gems!</p>
            </div>
          ) : (
            // Extra bottom padding so the last row can scroll clear of the pinned "your rank" bar.
            <div className="space-y-3" style={{ paddingBottom: '130px' }}>
              {others.length === 0 ? (
                <p className="text-center text-[14px] text-[var(--muted)] py-10">
                  You're the only one in your class so far — invite classmates to compete! 🎉
                </p>
              ) : (
                others.map(r => <Row key={r.student_id} r={r} you={false} />)
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pinned "your live ranking" — stays docked above the bottom nav while the list scrolls behind it. */}
      {me && (
        <div className="sticky z-30" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          <div className="px-5 pt-5 pb-2 bg-gradient-to-t from-[var(--bg)] from-70% to-transparent">
            <div className="max-w-sm mx-auto">
              <p className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wide mb-2 px-1">Your live ranking</p>
              <Row r={me} you />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
