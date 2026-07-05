import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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

  if (studentLoading || loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-sans text-sm">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans px-5 py-8">
      <div className="max-w-sm mx-auto">
        <Link to="/home" className="text-[12px] font-bold text-slate-400">← Back to Home</Link>
        <h1 className="text-[20px] font-bold text-brand-900 tracking-tight mt-2 mb-6">Class leaderboard</h1>

        {!student.class_id && (
          <p className="text-[14px] text-slate-400">You're not in a class yet.</p>
        )}

        <div className="space-y-2">
          {rows.map((r, i) => (
            <motion.div
              key={r.student_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
              className={`flex items-center rounded-2xl p-3 border ${
                r.student_id === student.id ? 'bg-brand-50 border-brand-500' : 'bg-white border-slate-100'
              }`}
            >
              <span className="w-7 text-[14px] font-bold text-slate-400">{r.rank}</span>
              <span className="flex-1 text-[14px] font-bold text-brand-900 ml-2">
                {r.student_id === student.id ? 'You' : r.name}
              </span>
              <span className="text-[12px] text-slate-400">🔥{r.current_streak} · {r.weekly_score}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
