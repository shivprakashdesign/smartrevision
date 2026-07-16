// Scan a photo → the right thing, based on what the photo is:
//   syllabus/index page → chapter checklist in the PLAN (no schedules — topics
//     get created day-by-day as the student studies)
//   today's class notes → TOPICS learned today (real date_learned, revisions
//     scheduled from tonight)
// The AI classifies the page; the student can override before saving.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Camera01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { usePro } from '../lib/ProContext'
import { scanPhoto } from '../lib/scan'
import { subjectColor } from '../lib/subjects'
import { FREE_TOPIC_LIMIT } from '../lib/plan'
import { offsetsFor } from '../lib/schedule'

const READING_LINES = ['Reading your photo…', 'Finding your topics…', 'Almost done…']

// The review step, mode-aware:
//   mode 'plan'   → items become plan chapters
//   mode 'topics' → items become topics learned today (roomLeft caps free plans)
// Exported for the design-review harness.
export function ScanReview({ items, onToggle, mode, canSwitchMode, onSwitchMode, onSave, saving, roomLeft }) {
  const groups = {}
  items.forEach((item, i) => {
    const key = item.subject || 'General'
    ;(groups[key] || (groups[key] = [])).push({ ...item, i })
  })
  const picked = items.filter((t) => t.checked).length
  const overRoom = mode === 'topics' && roomLeft != null && picked > roomLeft

  return (
    <div>
      {mode === 'topics' ? (
        <p className="text-[14px] text-[var(--slate-txt)] mb-1">
          Looks like today's notes — <b className="text-[var(--ink)]">{items.length} topics</b> found. We'll schedule their revisions starting today.
        </p>
      ) : (
        <p className="text-[14px] text-[var(--slate-txt)] mb-1">
          We found <b className="text-[var(--ink)]">{items.length} chapters</b>. Untick anything you don't need.
        </p>
      )}
      {canSwitchMode && (
        <button type="button" onClick={onSwitchMode} className="text-[12px] font-bold text-brand-500 active:opacity-70">
          {mode === 'topics' ? 'These are syllabus chapters? Save to my plan instead' : 'This was today’s studying? Add as topics instead'}
        </button>
      )}

      <div className="space-y-4 mt-3 mb-5">
        {Object.entries(groups).map(([subject, rows]) => (
          <div key={subject}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: subjectColor(subject) }}>
              {subject}
            </p>
            <div className="space-y-1">
              {rows.map((row) => (
                <button
                  key={row.i}
                  type="button"
                  onClick={() => onToggle(row.i)}
                  className="w-full flex items-center gap-2.5 text-left py-1.5 active:opacity-70"
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
                      row.checked ? 'bg-brand-500 border-brand-500 text-white' : 'border-[var(--border)]'
                    }`}
                  >
                    {row.checked && <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={3} />}
                  </span>
                  <span className={`text-[14px] leading-snug ${row.checked ? 'text-[var(--ink)] font-semibold' : 'text-[var(--muted)] line-through'}`}>
                    {row.topic_name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {overRoom && (
        <p className="text-[12px] text-[var(--slate-txt)] bg-[rgba(37,99,235,0.08)] rounded-2xl px-4 py-3 mb-3">
          Your free plan has room for <b className="text-[var(--ink)]">{roomLeft} more topic{roomLeft === 1 ? '' : 's'}</b> — untick some, or{' '}
          <Link to="/pro" className="font-bold text-brand-500">go Pro</Link> for unlimited.
        </p>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={picked === 0 || saving || overRoom}
        className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform disabled:opacity-50"
      >
        {saving
          ? 'Saving…'
          : mode === 'topics'
            ? `Add ${picked} topic${picked === 1 ? '' : 's'} & schedule revisions`
            : `Save ${picked} chapter${picked === 1 ? '' : 's'} to my plan`}
      </button>
    </div>
  )
}

export default function ScanSyllabus() {
  const navigate = useNavigate()
  const { student } = useStudentProfile()
  const { isPro } = usePro()
  const fileRef = useRef(null)
  const [step, setStep] = useState('pick') // pick | reading | review | saved
  const [items, setItems] = useState([])
  const [mode, setMode] = useState('plan') // what saving will create: 'plan' | 'topics'
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState({ count: 0, mode: 'plan' })
  const [readingLine, setReadingLine] = useState(0)
  const [topicCount, setTopicCount] = useState(0)

  useEffect(() => {
    if (!student) return
    supabase
      .from('topics')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .then(({ count }) => setTopicCount(count || 0))
  }, [student])

  useEffect(() => {
    if (step !== 'reading') return
    const t = setInterval(() => setReadingLine((n) => (n + 1) % READING_LINES.length), 2500)
    return () => clearInterval(t)
  }, [step])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // same file can be picked again after an error
    if (!file || !student) return
    setError('')
    setStep('reading')
    try {
      // Their existing subjects help the AI match spellings.
      const { data: topicRows } = await supabase
        .from('topics').select('subject').eq('student_id', student.id).not('archived', 'is', true)
      const subjects = [...new Set((topicRows || []).map((t) => t.subject).filter(Boolean))]

      const result = await scanPhoto(file, subjects)
      if (!result.topics?.length) {
        setError(result.note || "We couldn't find anything to study in this photo — try your syllabus or notes.")
        setStep('pick')
        return
      }
      setItems(result.topics.map((t) => ({ ...t, checked: true })))
      setMode(result.page_type === 'notes' ? 'topics' : 'plan')
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('pick')
    }
  }

  async function save() {
    if (!student || saving) return
    setSaving(true)
    const ok = mode === 'topics' ? await saveAsTopics() : await saveAsPlan()
    setSaving(false)
    if (ok) setStep('saved')
  }

  async function saveAsPlan() {
    const perSubject = {}
    const rows = items
      .filter((t) => t.checked)
      .map((t) => {
        const subject = t.subject || 'General'
        perSubject[subject] = (perSubject[subject] || 0) + 1
        return {
          student_id: student.id,
          subject,
          chapter_name: t.topic_name,
          position: perSubject[subject] - 1
        }
      })
    // upsert + ignore: scanning the same page twice must not duplicate the plan
    const { error: dbError } = await supabase
      .from('plan_items')
      .upsert(rows, { onConflict: 'student_id,subject,chapter_name', ignoreDuplicates: true })
    if (dbError) {
      setError('Saving failed — please try again.')
      return false
    }
    setSaved({ count: rows.length, mode: 'plan' })
    return true
  }

  // Notes mode: these were studied TODAY, so they become real topics with the
  // standard schedule (offsetsFor already truncates at the exam date).
  async function saveAsTopics() {
    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10)
    const selected = items.filter((t) => t.checked)

    const { data: created, error: topicError } = await supabase
      .from('topics')
      .insert(
        selected.map((t) => ({
          student_id: student.id,
          subject: t.subject || 'General',
          topic_name: t.topic_name,
          date_learned: todayISO,
          priority: 'medium',
          schedule_type: 'standard'
        }))
      )
      .select('id')
    if (topicError) {
      setError(
        topicError.message?.includes('PRO_REQUIRED')
          ? `That's past the free limit of ${FREE_TOPIC_LIMIT} topics — untick some or go Pro.`
          : 'Saving failed — please try again.'
      )
      return false
    }

    const offsets = offsetsFor(student.exam_date, today)
    const revisionRows = (created || []).flatMap((topic) =>
      offsets.map(({ label, days }) => {
        const d = new Date(today)
        d.setDate(d.getDate() + days)
        return { topic_id: topic.id, scheduled_date: d.toISOString().slice(0, 10), interval_label: label }
      })
    )
    const { error: revisionsError } = await supabase.from('revisions').insert(revisionRows)
    if (revisionsError) {
      setError('Topics saved, but scheduling failed — open a topic to rebuild its schedule.')
      return false
    }
    setSaved({ count: selected.length, mode: 'topics' })
    return true
  }

  const roomLeft = isPro ? null : Math.max(0, FREE_TOPIC_LIMIT - topicCount)

  return (
    <AppShell><div className="px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-sm space-y-3">
        <Link to="/add-topic" className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--muted)]">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2.2} /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-6"
        >
          <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight mb-1">Scan a page</h1>

          <AnimatePresence mode="wait">
            {step === 'pick' && (
              <motion.div key="pick" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <p className="text-[14px] text-[var(--slate-txt)] mb-4">
                  Photograph your <b className="text-[var(--ink)]">syllabus or index page</b> to build your chapter plan — or <b className="text-[var(--ink)]">today's class notes</b> to log what you studied.
                </p>
                {error && (
                  <p className="text-[13px] text-red-500 bg-red-500/10 rounded-2xl px-4 py-3 mb-3">{error}</p>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-10 rounded-2xl border-2 border-dashed border-[var(--border)] text-[var(--slate-txt)] flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <HugeiconsIcon icon={Camera01Icon} size={32} strokeWidth={1.5} />
                  <span className="text-[14px] font-bold">Take or choose a photo</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <p className="text-[11px] text-[var(--muted)] text-center mt-3">
                  We'll work out which one it is and set things up for you.
                </p>
              </motion.div>
            )}

            {step === 'reading' && (
              <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12 text-center">
                <div className="w-10 h-10 mx-auto mb-4 rounded-full border-[3px] border-[var(--card-alt)] border-t-brand-500 animate-spin" />
                <p className="text-[14px] font-bold text-[var(--ink)]">{READING_LINES[readingLine]}</p>
                <p className="text-[12px] text-[var(--muted)] mt-1">This takes a few seconds.</p>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                {error && <p className="text-[13px] text-red-500 mb-2">{error}</p>}
                <ScanReview
                  items={items}
                  onToggle={(i) => setItems((prev) => prev.map((t, idx) => (idx === i ? { ...t, checked: !t.checked } : t)))}
                  mode={mode}
                  canSwitchMode
                  onSwitchMode={() => { setError(''); setMode((m) => (m === 'topics' ? 'plan' : 'topics')) }}
                  onSave={save}
                  saving={saving}
                  roomLeft={roomLeft}
                />
              </motion.div>
            )}

            {step === 'saved' && (
              <motion.div key="saved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                <p className="text-4xl mb-3">🎉</p>
                {saved.mode === 'topics' ? (
                  <>
                    <p className="text-[17px] font-bold text-[var(--ink)]">
                      {saved.count} topic{saved.count === 1 ? '' : 's'} added
                    </p>
                    <p className="text-[13px] text-[var(--muted)] mt-2 mb-6">
                      Revisions are scheduled — the first one is today, while it's fresh.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/home')}
                      className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
                    >
                      Revise now
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[17px] font-bold text-[var(--ink)]">
                      {saved.count} chapter{saved.count === 1 ? '' : 's'} saved to your plan
                    </p>
                    <p className="text-[13px] text-[var(--muted)] mt-2 mb-6">
                      Now add what you study each day — we'll schedule the revisions.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/plan')}
                      className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
                    >
                      See my plan
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div></AppShell>
  )
}
