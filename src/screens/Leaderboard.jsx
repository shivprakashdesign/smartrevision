import { useEffect, useState } from 'react'
import AppShell from '../lib/AppShell'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import NumberFlow from '@number-flow/react'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'

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

  if (studentLoading || loading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading...</div>

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto">
        <Link to="/home" className="text-[12px] font-bold text-[var(--muted)]">← Back to Home</Link>
        <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight mt-2 mb-6">Class leaderboard</h1>

        {!student.class_id && (
          <p className="text-[14px] text-[var(--muted)]">You're not in a class yet.</p>
        )}

        <div className="space-y-2">
          {rows.map((r, i) => (
            <motion.div
              key={r.student_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
              className={`flex items-center rounded-2xl p-3 border ${
                r.student_id === student.id ? 'border-brand-500 bg-[rgba(37,99,235,0.12)]' : 'bg-[var(--card)] border-[var(--border)]'
              }`}
            >
              <span className="w-7 text-[14px] font-bold text-[var(--muted)]">{r.rank}</span>
              <span className="flex-1 text-[14px] font-bold text-[var(--ink)] ml-2">
                {r.student_id === student.id ? 'You' : r.name}
              </span>
              <span className="text-[12px] text-[var(--muted)]">🔥<NumberFlow value={r.current_streak} /> · <NumberFlow value={r.weekly_score} /></span>
            </motion.div>
          ))}
        </div>
      </div>
    </div></AppShell>
  )
}
