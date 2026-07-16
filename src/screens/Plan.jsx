// Your plan: the chapters scanned from the syllabus, with honest progress —
// a chapter is "started" once its first topic is logged, and "done" when the
// student says so (we can't know when a chapter is truly finished).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Tick02Icon, Camera01Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { subjectColor } from '../lib/subjects'

export default function Plan() {
  const { student } = useStudentProfile()
  const [items, setItems] = useState(null)
  const [topicCounts, setTopicCounts] = useState({})

  useEffect(() => {
    if (!student) return
    load()
  }, [student])

  async function load() {
    const [{ data: rows }, { data: topics }] = await Promise.all([
      supabase
        .from('plan_items')
        .select('id, subject, chapter_name, status')
        .eq('student_id', student.id)
        .order('subject')
        .order('position'),
      supabase
        .from('topics')
        .select('plan_item_id')
        .eq('student_id', student.id)
        .not('plan_item_id', 'is', null)
    ])
    const counts = {}
    for (const t of topics || []) counts[t.plan_item_id] = (counts[t.plan_item_id] || 0) + 1
    setItems(rows || [])
    setTopicCounts(counts)
  }

  // Tap the tick: not-done → done; done → back to started/pending.
  async function toggleDone(item) {
    const next = item.status === 'done' ? (topicCounts[item.id] ? 'started' : 'pending') : 'done'
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: next } : it)))
    const { error } = await supabase.from('plan_items').update({ status: next }).eq('id', item.id)
    if (error) load() // roll back the optimistic flip
  }

  if (items === null) {
    return <AppShell><div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading…</div></AppShell>
  }

  const groups = {}
  for (const it of items) (groups[it.subject] || (groups[it.subject] = [])).push(it)
  const started = items.filter((it) => it.status !== 'pending').length
  const done = items.filter((it) => it.status === 'done').length

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
          <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight">Your plan</h1>

          {items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[14px] text-[var(--slate-txt)] mb-4">No chapters yet — scan your syllabus to build your plan.</p>
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
              >
                <HugeiconsIcon icon={Camera01Icon} size={18} strokeWidth={2} /> Scan your syllabus
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-[var(--muted)] mt-1 mb-4">
                <b className="text-[var(--ink)]">{started}</b> of {items.length} chapters started{done > 0 ? <> · <b className="text-emerald-600">{done} done</b></> : null}
              </p>

              <div className="space-y-4">
                {Object.entries(groups).map(([subject, rows]) => (
                  <div key={subject}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: subjectColor(subject) }}>
                      {subject}
                    </p>
                    <div className="space-y-1">
                      {rows.map((item) => {
                        const count = topicCounts[item.id] || 0
                        const isDone = item.status === 'done'
                        return (
                          <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                            <button
                              type="button"
                              onClick={() => toggleDone(item)}
                              aria-label={isDone ? 'Mark not done' : 'Mark done'}
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors active:scale-90 ${
                                isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)]'
                              }`}
                            >
                              {isDone && <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />}
                            </button>
                            <span className={`text-[14px] leading-snug flex-1 min-w-0 ${isDone ? 'text-[var(--muted)] line-through' : 'text-[var(--ink)] font-semibold'}`}>
                              {item.chapter_name}
                            </span>
                            {count > 0 && (
                              <span className="text-[11px] font-bold text-brand-500 shrink-0">
                                {count} topic{count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/scan"
                className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-500 active:opacity-70"
              >
                <HugeiconsIcon icon={Camera01Icon} size={15} strokeWidth={2} /> Scan another page
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </div></AppShell>
  )
}
