import { useEffect, useState } from 'react'
import { initNotifications } from '../lib/notifications'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useStudentProfile } from '../lib/useStudentProfile'

function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans px-5 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-5 w-28 rounded-full bg-slate-200 animate-pulse" />
          </div>
          <div className="h-8 w-14 rounded-2xl bg-slate-200 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 w-32 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-4 w-12 rounded-full bg-slate-200 animate-pulse" />
              </div>
              <div className="h-3 w-24 rounded-full bg-slate-200 animate-pulse mb-3" />
              <div className="h-9 w-full rounded-2xl bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { user, logout } = useAuth()
  const { student, loading: studentLoading } = useStudentProfile()
  const [dueTopics, setDueTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    loadDueToday()
  }, [student])

  useEffect(() => {
    if (user) initNotifications(user.id)
  }, [user])

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
    high: 'bg-red-50 text-red-500',
    medium: 'bg-amber-50 text-amber-500',
    low: 'bg-slate-100 text-slate-400'
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans px-5 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-[13px] text-slate-400">Hi {student?.name}</p>
            <h1 className="text-[22px] font-bold text-brand-900 leading-tight tracking-tight">Due today</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-brand-50 rounded-2xl px-3 py-1.5 text-center">
              <p className="text-sm font-bold text-brand-600">🔥 {student?.current_streak || 0}</p>
            </div>
            <button onClick={logout} className="text-[11px] font-bold text-slate-400 active:text-red-500 transition-colors">
              Log out
            </button>
          </div>
        </div>

        {dueTopics.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 py-12 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-[15px] text-slate-400">Nothing due today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dueTopics.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <Link to={`/topic/${r.topics.id}`} className="font-bold text-[15px] text-brand-900">
                    {r.topics.topic_name}
                  </Link>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityStyle[r.topics.priority]}`}>
                    {r.topics.priority?.toUpperCase()}
                  </span>
                </div>
                <p className="text-[13px] text-slate-400 mb-3">
                  {r.topics.subject} · {r.interval_label.replace('_', ' ')}
                </p>
                <Link
                  to={`/revise/${r.id}`}
                  className="block w-full text-center py-2.5 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-[0.97] transition-transform"
                >
                  Revise now
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Link
            to="/add-topic"
            className="block w-full py-3 rounded-3xl border-2 border-dashed border-brand-100 text-center text-[13px] font-bold text-brand-500 active:scale-[0.98] transition-transform"
          >
            + Add topic
          </Link>
          <Link to="/leaderboard" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-slate-400 active:text-slate-600">
            🏆 View leaderboard
          </Link>
          <Link to="/settings/notifications" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-slate-400 active:text-slate-600">
            🔔 Notification settings
          </Link>
          <Link to="/learn" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-slate-400 active:text-slate-600">
            📖 Learn
          </Link>
          <Link to="/referral" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-slate-400 active:text-slate-600">
            🎁 Refer a friend
          </Link>
          <Link to="/profiles" className="block w-full py-3 rounded-3xl text-center text-[13px] font-bold text-slate-400 active:text-slate-600">
            👨‍👩‍👧 Switch child
          </Link>
        </div>
      </div>
    </div>
  )
}
