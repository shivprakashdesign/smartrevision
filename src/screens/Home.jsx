import { useEffect, useState } from 'react'
import { initNotifications } from '../lib/notifications'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import NumberFlow from '@number-flow/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useStudentProfile } from '../lib/useStudentProfile'
import { applyPendingShare } from '../lib/sharing'
import AppShell from '../lib/AppShell'

function HomeSkeleton() {
  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-full bg-[var(--card-alt)] animate-pulse" />
            <div className="h-5 w-28 rounded-full bg-[var(--card-alt)] animate-pulse" />
          </div>
          <div className="h-8 w-14 rounded-2xl bg-[var(--card-alt)] animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)]">
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 w-32 rounded-full bg-[var(--card-alt)] animate-pulse" />
                <div className="h-4 w-12 rounded-full bg-[var(--card-alt)] animate-pulse" />
              </div>
              <div className="h-3 w-24 rounded-full bg-[var(--card-alt)] animate-pulse mb-3" />
              <div className="h-9 w-full rounded-2xl bg-[var(--card-alt)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div></AppShell>
  )
}

export default function Home() {
  const { user, logout } = useAuth()
  const { student, loading: studentLoading } = useStudentProfile()
  const navigate = useNavigate()
  const [dueTopics, setDueTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    loadDueToday()
  }, [student])

  useEffect(() => {
    if (user) initNotifications(user.id)
  }, [user])

  // If this visitor arrived via a shared-topic link and just signed up, finish
  // the "Save to my revisions" flow now that their profile exists.
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

  async function loadDueToday() {
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('revisions')
      .select('id, scheduled_date, interval_label, completed, topics(id, topic_name, subject, priority)')
      .eq('completed', false)
      .lte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })

    if (error) console.error(error)
    setDueTopics(data || [])
    setLoading(false)
  }

  if (studentLoading || loading) {
    return <HomeSkeleton />
  }

  const priorityStyle = {
    high: 'text-red-500',
    medium: 'text-amber-500',
    low: 'text-[var(--muted)]'
  }
  const priorityBg = {
    high: 'rgba(239,68,68,0.14)',
    medium: 'rgba(245,158,11,0.16)',
    low: 'var(--card-alt)'
  }

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-[13px] text-[var(--muted)]">Hi {student?.name}</p>
            <h1 className="text-[22px] font-bold text-[var(--ink)] leading-tight tracking-tight">Due today</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl px-3 py-1.5 text-center" style={{ backgroundColor: 'rgba(37,99,235,0.14)' }}>
              <p className="text-sm font-bold text-brand-500">🔥 <NumberFlow value={student?.current_streak || 0} /></p>
            </div>
            <button onClick={logout} className="text-[11px] font-bold text-[var(--muted)] active:text-red-500 transition-colors">
              Log out
            </button>
          </div>
        </div>

        {dueTopics.length === 0 ? (
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] py-12 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-[15px] text-[var(--muted)]">Nothing due today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dueTopics.map((r) => (
              <div
                key={r.id}
                className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)] shadow-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <Link to={`/topic/${r.topics.id}`} className="font-bold text-[15px] text-[var(--ink)]">
                    {r.topics.topic_name}
                  </Link>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityStyle[r.topics.priority]}`}
                    style={{ backgroundColor: priorityBg[r.topics.priority] }}>
                    {r.topics.priority?.toUpperCase()}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--slate-txt)] mb-3">
                  {r.topics.subject} · {r.interval_label.replace('_', ' ')}
                </p>
                <Link
                  to={`/revise/${r.id}`}
                  className="block w-full text-center py-2.5 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-[0.97] transition-transform"
                >
                  Revise now
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Link
            to="/add-topic"
            className="block w-full py-3 rounded-3xl border-2 border-dashed border-brand-100 text-center text-[13px] font-bold text-brand-500 active:scale-[0.97] transition-transform"
          >
            + Add topic
          </Link>
          <Link to="/leaderboard" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-[var(--muted)] active:opacity-70">
            🏆 View leaderboard
          </Link>
          <Link to="/settings/notifications" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-[var(--muted)] active:opacity-70">
            🔔 Notification settings
          </Link>
          <Link to="/learn" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-[var(--muted)] active:opacity-70">
            📖 Learn
          </Link>
          <Link to="/referral" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-[var(--muted)] active:opacity-70">
            🎁 Refer a friend
          </Link>
          <Link to="/profiles" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-[var(--muted)] active:opacity-70">
            👨‍👩‍👧 Switch child
          </Link>
          <Link to="/settings/theme" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-[var(--muted)] active:opacity-70">
            🎨 Theme
          </Link>
        </div>
      </div>
    </div></AppShell>
  )
}
