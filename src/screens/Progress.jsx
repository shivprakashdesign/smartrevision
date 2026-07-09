import { useEffect, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import AppShell from '../lib/AppShell'
import { computeMemory } from '../lib/metrics'

function Stat({ value, label, suffix = '', accent }) {
  return (
    <div className="bg-[var(--card)] rounded-3xl p-4 border border-[var(--border)] shadow-sm">
      <p className="text-[28px] font-bold tracking-tight" style={{ color: accent || 'var(--ink)' }}>
        <NumberFlow value={value} />{suffix}
      </p>
      <p className="text-[12px] font-bold text-[var(--muted)] mt-0.5">{label}</p>
    </div>
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
      .select('id, revisions(id, scheduled_date, interval_label, completed, completed_at, recall_quality)')
      .eq('student_id', student.id)
      .not('archived', 'is', true)
      .then(({ data, error }) => {
        if (error) console.error(error)
        setTopics(data || [])
        setLoading(false)
      })
  }, [student])

  if (studentLoading || loading) {
    return <AppShell nav><div className="px-5 pt-6"><div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map(i => <div key={i} className="h-24 rounded-3xl bg-[var(--card-alt)] animate-pulse" />)}
    </div></div></AppShell>
  }

  const allRevs = topics.flatMap(t => t.revisions || [])
  const revisionsDone = allRevs.filter(r => r.completed).length
  const memories = topics.map(t => computeMemory(t.revisions || [])).filter(m => m != null)
  const avgMemory = memories.length ? Math.round(memories.reduce((a, b) => a + b, 0) / memories.length) : 0

  return (
    <AppShell nav><div className="px-5 pt-6 pb-4">
      <div className="max-w-sm mx-auto">
        <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mb-5">Progress</h1>
        <div className="grid grid-cols-2 gap-3">
          <Stat value={student?.current_streak || 0} label="Day streak" accent="hsl(38,92%,50%)" />
          <Stat value={student?.gems || 0} label="Gems earned" accent="hsl(213,96%,56%)" />
          <Stat value={topics.length} label="Topics" />
          <Stat value={revisionsDone} label="Revisions done" />
          <Stat value={avgMemory} suffix="%" label="Avg memory" accent="hsl(160,84%,39%)" />
        </div>
        <p className="text-[12px] text-[var(--muted)] text-center mt-6 px-6">
          Keep revising on schedule to grow your memory and streak. More insights coming soon.
        </p>
      </div>
    </div></AppShell>
  )
}
