import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import AppShell from '../lib/AppShell'
import { completion, computeMemory, topicBucket } from '../lib/metrics'

const BUCKET_STYLE = {
  due: { label: 'Due today', cls: 'text-emerald-600 bg-emerald-500/12' },
  missed: { label: 'Missed', cls: 'text-red-500 bg-red-500/12' },
  upcoming: { label: 'Upcoming', cls: 'text-[var(--slate-txt)] bg-[var(--card-alt)]' },
  done: { label: 'Complete', cls: 'text-brand-500 bg-brand-500/12' }
}

export default function Topics() {
  const { student, loading: studentLoading } = useStudentProfile()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    supabase
      .from('topics')
      .select('id, subject, topic_name, revisions(id, scheduled_date, interval_label, completed, completed_at, recall_quality)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setTopics(data || [])
        setLoading(false)
      })
  }, [student])

  if (studentLoading || loading) {
    return <AppShell nav><div className="px-5 pt-6"><div className="max-w-sm mx-auto space-y-3">
      {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-3xl bg-[var(--card-alt)] animate-pulse" />)}
    </div></div></AppShell>
  }

  // Group by subject.
  const bySubject = {}
  for (const t of topics) (bySubject[t.subject || 'General'] ??= []).push(t)

  return (
    <AppShell nav><div className="px-5 pt-6 pb-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight">Topics</h1>
          <Link to="/add-topic" className="px-3.5 py-2 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-95 transition-transform">+ Add</Link>
        </div>

        {topics.length === 0 ? (
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] py-12 text-center">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-[15px] text-[var(--muted)]">No topics yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(bySubject).map(([subject, list]) => (
              <div key={subject}>
                <p className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wide mb-2 px-1">{subject}</p>
                <div className="space-y-2.5">
                  {list.map(t => {
                    const revs = t.revisions || []
                    const { pct } = completion(revs)
                    const memory = computeMemory(revs)
                    const b = BUCKET_STYLE[topicBucket(revs)]
                    return (
                      <Link key={t.id} to={`/topic/${t.id}`}
                        className="block bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)] shadow-sm active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[15px] font-bold text-[var(--ink)]">{t.topic_name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--card-alt)] overflow-hidden mb-2">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] font-bold text-[var(--muted)]">
                          {pct}% complete · {memory == null ? 'New' : `${memory}% memory`}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div></AppShell>
  )
}
