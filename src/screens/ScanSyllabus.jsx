// Scan your syllabus → your study plan. The photo becomes a chapter checklist
// (plan_items), NOT topics — topics get created day-by-day as the student
// actually studies, which is when the forgetting curve honestly starts.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Camera01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { scanPhoto } from '../lib/scan'
import { subjectColor } from '../lib/subjects'

const READING_LINES = ['Reading your photo…', 'Finding your chapters…', 'Almost done…']

// The review step: extracted chapters grouped by subject, everything ticked by
// default, untick what you don't need. Exported for the design-review harness.
export function ScanReview({ items, onToggle, pageType, onSave, saving }) {
  const groups = {}
  items.forEach((item, i) => {
    const key = item.subject || 'General'
    ;(groups[key] || (groups[key] = [])).push({ ...item, i })
  })
  const picked = items.filter((t) => t.checked).length

  return (
    <div>
      <p className="text-[14px] text-[var(--slate-txt)] mb-1">
        We found <b className="text-[var(--ink)]">{items.length} chapters</b>. Untick anything you don't need.
      </p>
      {pageType === 'notes' && (
        <p className="text-[12px] text-[var(--muted)] mb-2">
          This looks like class notes — we'll save these to your plan too.
        </p>
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

      <button
        type="button"
        onClick={onSave}
        disabled={picked === 0 || saving}
        className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform disabled:opacity-50"
      >
        {saving ? 'Saving…' : `Save ${picked} chapter${picked === 1 ? '' : 's'} to my plan`}
      </button>
    </div>
  )
}

export default function ScanSyllabus() {
  const navigate = useNavigate()
  const { student } = useStudentProfile()
  const fileRef = useRef(null)
  const [step, setStep] = useState('pick') // pick | reading | review | saved
  const [items, setItems] = useState([])
  const [pageType, setPageType] = useState('syllabus')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [readingLine, setReadingLine] = useState(0)

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
        setError(result.note || "We couldn't find chapters in this photo — try your syllabus or index page.")
        setStep('pick')
        return
      }
      setItems(result.topics.map((t) => ({ ...t, checked: true })))
      setPageType(result.page_type || 'syllabus')
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('pick')
    }
  }

  async function save() {
    if (!student) return
    setSaving(true)
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
    setSaving(false)
    if (dbError) {
      setError('Saving failed — please try again.')
      return
    }
    setSavedCount(rows.length)
    setStep('saved')
  }

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
          <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight mb-1">Scan your syllabus</h1>

          <AnimatePresence mode="wait">
            {step === 'pick' && (
              <motion.div key="pick" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <p className="text-[14px] text-[var(--slate-txt)] mb-4">
                  Take a photo of your syllabus or your textbook's index page. We'll turn it into your chapter plan.
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
                  Chapters go into your plan — you'll add what you studied day by day.
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
                  pageType={pageType}
                  onSave={save}
                  saving={saving}
                />
              </motion.div>
            )}

            {step === 'saved' && (
              <motion.div key="saved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-[17px] font-bold text-[var(--ink)]">
                  {savedCount} chapter{savedCount === 1 ? '' : 's'} saved to your plan
                </p>
                <p className="text-[13px] text-[var(--muted)] mt-2 mb-6">
                  Now add what you study each day — we'll schedule the revisions.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div></AppShell>
  )
}
