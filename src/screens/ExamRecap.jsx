// The exam receipt. After the exam: tag which topics came up on the paper →
// see proof the system worked ("9 of 11 — already revised"). The tagging is
// stored (exam_recaps); the receipt is recomputed from live topic data.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Tick02Icon, Share01Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { subjectColor } from '../lib/subjects'
import { receiptStats, receiptShareText } from '../lib/receipt'

const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

// The receipt itself — the screenshot-worthy part. Exported for the harness.
export function Receipt({ stats, examDate, onShare, onEdit }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
        Exam receipt · {longDate(examDate)}
      </p>
      <p className="text-[56px] font-bold tracking-tight leading-none mt-3 text-emerald-600">
        {stats.revised}<span className="text-[28px] text-[var(--muted)]">/{stats.appeared}</span>
      </p>
      <p className="text-[14px] font-semibold text-[var(--ink)] mt-1.5">
        topics on your paper — already revised
      </p>
      {stats.reps > 0 && (
        <p className="text-[12px] text-[var(--muted)] mt-1 mb-5">
          backed by <b className="text-[var(--slate-txt)]">{stats.reps} revision{stats.reps === 1 ? '' : 's'}</b> before exam day
        </p>
      )}

      <div className="text-left rounded-2xl border border-[var(--border)] p-4 space-y-2 mb-4">
        {stats.rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                row.revised ? 'bg-emerald-500 text-white' : 'border-2 border-[var(--border)]'
              }`}
            >
              {row.revised && <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />}
            </span>
            <span className="text-[13.5px] font-semibold text-[var(--ink)] flex-1 min-w-0 truncate">{row.topic_name}</span>
            <span className="text-[11px] font-bold shrink-0" style={{ color: subjectColor(row.subject) }}>
              {row.subject}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onShare}
        className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform inline-flex items-center justify-center gap-2"
      >
        <HugeiconsIcon icon={Share01Icon} size={17} strokeWidth={2} /> Share my receipt
      </button>
      <button type="button" onClick={onEdit} className="mt-3 text-[12px] font-bold text-[var(--muted)] underline underline-offset-2 active:opacity-70">
        Edit what came up
      </button>
      <p className="text-[12px] text-[var(--slate-txt)] mt-4">
        Next exam? <Link to="/settings/study-plan" className="font-bold text-brand-500">Set the date</Link> and we'll plan it together.
      </p>
    </div>
  )
}

export default function ExamRecap() {
  const navigate = useNavigate()
  const { student } = useStudentProfile()
  const [topics, setTopics] = useState(null)
  const [tagged, setTagged] = useState(new Set())
  const [view, setView] = useState('loading') // loading | pick | receipt
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!student) return
    if (!student.exam_date) { navigate('/home'); return }
    load()
  }, [student])

  async function load() {
    const [{ data: topicRows }, { data: recap }] = await Promise.all([
      supabase
        .from('topics')
        .select('id, subject, topic_name, revisions(completed)')
        .eq('student_id', student.id)
        .not('archived', 'is', true),
      supabase
        .from('exam_recaps')
        .select('appeared_topic_ids')
        .eq('student_id', student.id)
        .eq('exam_date', student.exam_date)
        .maybeSingle()
    ])
    setTopics(topicRows || [])
    if (recap) {
      setTagged(new Set(recap.appeared_topic_ids))
      setView('receipt')
    } else {
      setView('pick')
    }
  }

  function toggle(id) {
    setTagged((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('exam_recaps').upsert(
      { student_id: student.id, exam_date: student.exam_date, appeared_topic_ids: [...tagged] },
      { onConflict: 'student_id,exam_date' }
    )
    setSaving(false)
    if (error) {
      toast.error('Saving failed — please try again.')
      return
    }
    setView('receipt')
  }

  async function share() {
    const text = receiptShareText(receiptStats(topics, [...tagged]))
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        toast.success('Copied — paste it anywhere 🎉')
      }
    } catch {
      /* user closed the share sheet */
    }
  }

  if (!student || view === 'loading') {
    return <AppShell><div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading…</div></AppShell>
  }

  const groups = {}
  for (const t of topics) (groups[t.subject || 'General'] || (groups[t.subject || 'General'] = [])).push(t)

  return (
    <AppShell><div className="px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-sm space-y-3">
        <Link to="/home" className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--muted)]">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2.2} /> Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-6"
        >
          <AnimatePresence mode="wait">
            {view === 'pick' && (
              <motion.div key="pick" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight">How did it go?</h1>
                <p className="text-[13px] text-[var(--slate-txt)] mt-1 mb-4">
                  Tap the topics that <b className="text-[var(--ink)]">came up in your exam</b> — we'll show you how ready you were.
                </p>

                {topics.length === 0 ? (
                  <p className="text-[13px] text-[var(--muted)] py-6 text-center">No topics yet — nothing to make a receipt from.</p>
                ) : (
                  <div className="space-y-4 mb-5">
                    {Object.entries(groups).map(([subject, rows]) => (
                      <div key={subject}>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: subjectColor(subject) }}>
                          {subject}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {rows.map((t) => {
                            const on = tagged.has(t.id)
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggle(t.id)}
                                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors active:scale-95 ${
                                  on ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--slate-txt)]'
                                }`}
                              >
                                {t.topic_name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={save}
                  disabled={tagged.size === 0 || saving}
                  className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  {saving ? 'Saving…' : `Make my receipt (${tagged.size} tagged)`}
                </button>
              </motion.div>
            )}

            {view === 'receipt' && (
              <motion.div key="receipt" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
                <Receipt
                  stats={receiptStats(topics, [...tagged])}
                  examDate={student.exam_date}
                  onShare={share}
                  onEdit={() => setView('pick')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div></AppShell>
  )
}
