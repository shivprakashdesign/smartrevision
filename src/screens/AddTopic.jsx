import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'

const STANDARD_OFFSETS = [
  { label: 'same_day', days: 0 },
  { label: '1_day', days: 1 },
  { label: '1_week', days: 7 },
  { label: '1_month', days: 30 },
  { label: '4_months', days: 120 }
]

export default function AddTopic() {
  const navigate = useNavigate()
  const { student, loading: studentLoading } = useStudentProfile()

  const [subject, setSubject] = useState('')
  const [topicName, setTopicName] = useState('')
  const [familiarity, setFamiliarity] = useState('first_time')
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes] = useState('')
  const [pastSubjects, setPastSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!student) return
    supabase
      .from('topics')
      .select('subject')
      .eq('student_id', student.id)
      .then(({ data }) => {
        if (data) setPastSubjects([...new Set(data.map(t => t.subject).filter(Boolean))])
      })
  }, [student])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!student) return
    setSaving(true)
    setError('')

    const today = new Date()
    const dateLearned = today.toISOString().slice(0, 10)

    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert({
        student_id: student.id,
        subject,
        topic_name: topicName,
        date_learned: dateLearned,
        familiarity,
        priority,
        notes,
        schedule_type: 'standard'
      })
      .select()
      .single()

    if (topicError) {
      setError(topicError.message)
      setSaving(false)
      return
    }

    const revisionRows = STANDARD_OFFSETS.map(({ label, days }) => {
      const d = new Date(today)
      d.setDate(d.getDate() + days)
      return {
        topic_id: topic.id,
        scheduled_date: d.toISOString().slice(0, 10),
        interval_label: label
      }
    })

    const { error: revisionsError } = await supabase.from('revisions').insert(revisionRows)

    if (revisionsError) {
      setError(revisionsError.message)
      setSaving(false)
      return
    }

    navigate('/home')
  }

  if (studentLoading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-sans text-sm">Loading...</div>

  const familiarityOpts = [
    { v: 'first_time', l: 'First time' },
    { v: 'partial', l: 'Partial' },
    { v: 'familiar', l: 'Familiar' }
  ]
  const priorityOpts = [
    { v: 'high', l: 'High' },
    { v: 'medium', l: 'Medium' },
    { v: 'low', l: 'Low' }
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans px-6 py-10 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-6"
      >
        <h1 className="text-[20px] font-bold text-brand-900 tracking-tight mb-4">Add a topic</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Subject (e.g. Chemistry)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            list="subject-suggestions"
            required
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
          />
          <datalist id="subject-suggestions">
            {pastSubjects.map(s => <option key={s} value={s} />)}
          </datalist>

          <input
            type="text"
            placeholder="Topic name (e.g. Electrochemistry)"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            required
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
          />

          <div>
            <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Familiarity</p>
            <div className="flex gap-2">
              {familiarityOpts.map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setFamiliarity(opt.v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                    familiarity === opt.v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-400'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Priority</p>
            <div className="flex gap-2">
              {priorityOpts.map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setPriority(opt.v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                    priority === opt.v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-400'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
          />

          {error && <p className="text-red-500 text-[12px]">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? 'Saving...' : 'Add topic & schedule revisions'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
