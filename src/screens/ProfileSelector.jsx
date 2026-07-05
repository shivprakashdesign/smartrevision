import { useState } from 'react'
import AppShell from '../lib/AppShell'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStudentProfile } from '../lib/useStudentProfile'
import { useAuth } from '../lib/AuthContext'

export default function ProfileSelector() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { allStudents, loading, selectStudent, addChild } = useStudentProfile()

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [classGrade, setClassGrade] = useState('')
  const [saving, setSaving] = useState(false)

  function goToChild(id) {
    selectStudent(id)
    navigate('/home')
  }

  async function handleAddChild(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const created = await addChild(name.trim(), classGrade.trim())
    setSaving(false)
    if (created) navigate('/home')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-sans text-sm">Loading...</div>

  return (
    <AppShell><div className="px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-[20px] font-bold text-brand-900 tracking-tight">Your children</h1>
          <button onClick={logout} className="text-[11px] font-bold text-slate-400 active:text-red-500 transition-colors">Log out</button>
        </div>

        <div className="space-y-2 mb-4">
          {allStudents.map((child, i) => (
            <motion.button
              key={child.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => goToChild(child.id)}
              className="w-full text-left bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform"
            >
              <div>
                <p className="font-bold text-[14px] text-brand-900">{child.name}</p>
                {child.class_grade && <p className="text-[12px] text-slate-400">{child.class_grade}</p>}
              </div>
              <span className="text-[12px] text-slate-400">🔥{child.current_streak || 0}</span>
            </motion.button>
          ))}
        </div>

        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-3 rounded-3xl border-2 border-dashed border-brand-100 text-[13px] font-bold text-brand-500 active:scale-[0.98] transition-transform"
          >
            + Add a child
          </button>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onSubmit={handleAddChild}
            className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-2"
          >
            <input
              type="text"
              placeholder="Child's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
            />
            <input
              type="text"
              placeholder="Class (e.g. Class 7)"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-3 py-2 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-2xl bg-brand-500 text-white text-[13px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {saving ? 'Adding...' : 'Add child'}
            </button>
          </motion.form>
        )}
      </div>
    </div></AppShell>
  )
}
