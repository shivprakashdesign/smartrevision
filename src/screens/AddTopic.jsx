import { useState, useEffect } from 'react'
import AppShell from '../lib/AppShell'
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

const DEFAULT_SUBJECTS = ['Maths', 'Science', 'Computer Sci.', 'Languages', 'History']

function labelForOffset(days) {
  if (days === 0) return 'same_day'
  if (days === 1) return '1_day'
  return `${days}_days`
}

export default function AddTopic() {
  const navigate = useNavigate()
  const { student, loading: studentLoading } = useStudentProfile()

  const [subject, setSubject] = useState('')
  const [topicName, setTopicName] = useState('')
  const [familiarity, setFamiliarity] = useState('first_time')
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes] = useState('')
  const [pastSubjects, setPastSubjects] = useState([])
  const [customSubject, setCustomSubject] = useState(false)
  const [scheduleType, setScheduleType] = useState('standard')
  const [customOffsets, setCustomOffsets] = useState([])
  const [offsetInput, setOffsetInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const subjectOptions = [...new Set([...pastSubjects, ...DEFAULT_SUBJECTS])]

  function addCustomOffset() {
    const days = parseInt(offsetInput, 10)
    if (!Number.isInteger(days) || days < 0 || customOffsets.includes(days)) return
    setCustomOffsets([...customOffsets, days].sort((a, b) => a - b))
    setOffsetInput('')
  }

  function removeCustomOffset(days) {
    setCustomOffsets(customOffsets.filter(d => d !== days))
  }

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
    if (!subject.trim()) {
      setError('Please select or enter a subject')
      return
    }
    if (scheduleType === 'custom' && customOffsets.length === 0) {
      setError('Add at least one custom revision date')
      return
    }
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
        schedule_type: scheduleType
      })
      .select()
      .single()

    if (topicError) {
      setError(topicError.message)
      setSaving(false)
      return
    }

    const offsets = scheduleType === 'custom'
      ? customOffsets.map(days => ({ label: labelForOffset(days), days }))
      : STANDARD_OFFSETS

    const revisionRows = offsets.map(({ label, days }) => {
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

  if (studentLoading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading...</div>

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
    <AppShell><div className="px-6 py-10 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-6"
      >
        <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight mb-4">Add a topic</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="text-[11px] font-bold text-[var(--muted)] mb-1.5 uppercase tracking-wide">Subject</p>
            <div className="flex flex-wrap gap-2">
              {subjectOptions.map(s => {
                const selected = !customSubject && subject === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSubject(s); setCustomSubject(false) }}
                    className={`px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-colors ${
                      selected ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => { setCustomSubject(true); setSubject('') }}
                className={`px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-colors ${
                  customSubject ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                }`}
              >
                Other
              </button>
            </div>
            {customSubject && (
              <input
                type="text"
                placeholder="Subject (e.g. Chemistry)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                autoFocus
                required
                className="w-full mt-2 border border-[var(--border)] rounded-2xl px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
              />
            )}
          </div>

          <input
            type="text"
            placeholder="Topic name (e.g. Electrochemistry)"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            required
            className="w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
          />

          <div>
            <p className="text-[11px] font-bold text-[var(--muted)] mb-1.5 uppercase tracking-wide">Familiarity</p>
            <div className="flex gap-2">
              {familiarityOpts.map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setFamiliarity(opt.v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                    familiarity === opt.v ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-[var(--muted)] mb-1.5 uppercase tracking-wide">Priority</p>
            <div className="flex gap-2">
              {priorityOpts.map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setPriority(opt.v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                    priority === opt.v ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-[var(--muted)] mb-1.5 uppercase tracking-wide">Schedule</p>
            <div className="flex gap-2">
              {[{ v: 'standard', l: 'Standard' }, { v: 'custom', l: 'Custom' }].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setScheduleType(opt.v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                    scheduleType === opt.v ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {scheduleType === 'standard' && (
              <p className="text-[11px] text-[var(--muted)] mt-2">Same day, 1 day, 1 week, 1 month, 4 months</p>
            )}

            {scheduleType === 'custom' && (
              <div className="mt-2">
                {customOffsets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {customOffsets.map(days => (
                      <span
                        key={days}
                        className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] font-bold border-2 border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]"
                      >
                        {labelForOffset(days).replace('_', ' ')}
                        <button
                          type="button"
                          onClick={() => removeCustomOffset(days)}
                          className="text-brand-500 leading-none"
                          aria-label={`Remove ${days} day offset`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Days after learning"
                    value={offsetInput}
                    onChange={(e) => setOffsetInput(e.target.value)}
                    className="flex-1 border border-[var(--border)] rounded-2xl px-4 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addCustomOffset}
                    className="px-4 py-2 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-[0.98] transition-transform"
                  >
                    + Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
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
    </div></AppShell>
  )
}
