// Fast-start alternative to the photo scan: instead of photographing the
// syllabus, pick chapters straight from the hardcoded tree (src/lib/syllabus.js),
// filtered to the student's board + class + chosen subjects. Selected chapters
// become plan_items — the exact same rows the scan flow writes — so this sits
// ALONGSIDE scan/manual, never replacing them. The weighted weekly calendar
// (step 5) reads these plan_items back and looks their weights up in the tree.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Camera01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { subjectColor } from '../lib/subjects'
import { syllabusSubjects, chaptersFor, chapterWeight } from '../lib/syllabus'

const BOARD = 'CBSE' // the only board with hardcoded data today

// A 1–3 "importance" reading for a chapter under the active lens, so the student
// sees why some chapters will get more time. 0 (dropped from this exam) reads as
// a dash, not zero dots, to avoid looking like an error.
function importance(chapter, lens) {
  const w = chapterWeight(chapter, lens)
  if (w <= 0) return 0
  if (lens === 'board') return w >= 8 ? 3 : w >= 5 ? 2 : 1
  return w >= 3 ? 3 : w >= 2 ? 2 : 1
}

const key = (subject, chapter) => `${subject}::${chapter}`

export default function SyllabusPicker() {
  const { student } = useStudentProfile()
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [existing, setExisting] = useState(new Set())
  const [picked, setPicked] = useState(new Set())
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const cls = student?.class_grade ? Number(student.class_grade) : null
  const lens = student?.exam_lens || 'jee'
  const covered = cls ? syllabusSubjects(BOARD, cls) : []

  useEffect(() => {
    if (!student) return
    let cancelled = false
    ;(async () => {
      const [{ data: acct }, { data: rows }] = await Promise.all([
        supabase.from('accounts').select('subjects').eq('id', student.owner_account_id).single(),
        supabase.from('plan_items').select('subject, chapter_name').eq('student_id', student.id)
      ])
      if (cancelled) return
      const chosen = acct?.subjects || []
      // Only offer subjects the student both studies and we have a syllabus for.
      setSubjects(covered.filter(s => chosen.includes(s)))
      setExisting(new Set((rows || []).map(r => key(r.subject, r.chapter_name))))
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [student])

  function toggle(subject, chapter) {
    const k = key(subject, chapter)
    if (existing.has(k)) return // already in the plan — additive only
    setPicked(prev => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  }

  // Whole-subject: pick every chapter not already added, or clear them all.
  function toggleSubject(subject) {
    const chs = chaptersFor(BOARD, cls, subject)
    const keys = chs.map(c => key(subject, c.chapter)).filter(k => !existing.has(k))
    const allPicked = keys.every(k => picked.has(k))
    setPicked(prev => {
      const next = new Set(prev)
      keys.forEach(k => (allPicked ? next.delete(k) : next.add(k)))
      return next
    })
  }

  async function save() {
    const rows = []
    for (const subject of subjects) {
      chaptersFor(BOARD, cls, subject).forEach((ch, i) => {
        const k = key(subject, ch.chapter)
        if (picked.has(k) && !existing.has(k)) {
          rows.push({ student_id: student.id, subject, chapter_name: ch.chapter, position: i })
        }
      })
    }
    if (!rows.length) { toast.error('Pick a few chapters first'); return }
    setSaving(true)
    const { error } = await supabase
      .from('plan_items')
      .upsert(rows, { onConflict: 'student_id,subject,chapter_name', ignoreDuplicates: true })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Added ${rows.length} chapter${rows.length > 1 ? 's' : ''} to your plan`)
    navigate('/plan')
  }

  const pickedCount = picked.size

  // No hardcoded syllabus for this class (or the student studies none of the
  // covered subjects) → point them at the paths that always work.
  const noSyllabus = loaded && subjects.length === 0

  return (
    <AppShell><div className="px-5 pt-6 pb-28">
      <div className="max-w-sm mx-auto">
        <Link to="/plan" className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--muted)] active:opacity-70 transition-opacity mb-4">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} /> Your plan
        </Link>

        <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mb-1">Pick your chapters</h1>
        <p className="text-[14px] text-[var(--muted)] mb-6">
          {cls ? `Class ${cls} · ${BOARD}` : 'Set your class first'} — tap the chapters you're studying. The dots show how much they matter for {lens === 'board' ? 'your boards' : 'JEE'}.
        </p>

        {!loaded ? (
          <p className="text-[14px] text-[var(--muted)]">Loading…</p>
        ) : noSyllabus ? (
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm p-6 text-center">
            <p className="text-[14px] text-[var(--slate-txt)] mb-4">
              We don't have a ready-made syllabus for {cls ? `Class ${cls}` : 'your class'} yet. Scan your syllabus page or add topics by hand instead.
            </p>
            <Link to="/scan" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform">
              <HugeiconsIcon icon={Camera01Icon} size={18} strokeWidth={2} /> Scan your syllabus
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {subjects.map((subject, si) => {
              const chs = chaptersFor(BOARD, cls, subject)
              const selectable = chs.map(c => key(subject, c.chapter)).filter(k => !existing.has(k))
              const allPicked = selectable.length > 0 && selectable.every(k => picked.has(k))
              return (
                <motion.div key={subject}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: si * 0.05, ease: [0.23, 1, 0.32, 1] }}>
                  <div className="flex items-center justify-between px-1.5 mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider">
                      <span className={`inline-block w-2 h-2 rounded-full ${subjectColor(subject)} mr-1.5 align-middle`} />
                      <span className="text-[var(--ink)]">{subject}</span>
                    </p>
                    {selectable.length > 0 && (
                      <button onClick={() => toggleSubject(subject)} className="text-[12px] font-bold text-brand-500 active:opacity-70">
                        {allPicked ? 'Clear' : 'Select all'}
                      </button>
                    )}
                  </div>
                  <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm divide-y divide-[var(--border)] overflow-hidden">
                    {chs.map(ch => {
                      const k = key(subject, ch.chapter)
                      const added = existing.has(k)
                      const sel = added || picked.has(k)
                      const dots = importance(ch, lens)
                      return (
                        <button key={ch.id} onClick={() => toggle(subject, ch.chapter)} disabled={added}
                          className="w-full flex items-center gap-3 text-left px-4 py-3 active:bg-[var(--card-alt)] disabled:opacity-100 transition-colors">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
                            sel ? 'bg-brand-500 border-brand-500 text-white' : 'border-[var(--border)]'
                          }`}>
                            {sel && <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-[14px] leading-snug ${added ? 'text-[var(--muted)]' : 'text-[var(--ink)] font-semibold'}`}>
                              {ch.chapter}
                            </span>
                            <span className="text-[11.5px] text-[var(--muted)]">
                              {ch.subtopics.length} topics{added ? ' · added' : ''}
                            </span>
                          </span>
                          <span className="flex items-center gap-0.5 shrink-0" aria-label={`importance ${dots} of 3`}>
                            {dots === 0
                              ? <span className="text-[12px] text-[var(--muted)]">—</span>
                              : [0, 1, 2].map(i => (
                                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < dots ? subjectColor(subject) : 'bg-[var(--border)]'}`} />
                              ))}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}

            <Link to="/scan" className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-brand-500 active:opacity-70 pt-1">
              <HugeiconsIcon icon={Camera01Icon} size={15} strokeWidth={2} /> Not listed? Scan your syllabus instead
            </Link>
          </div>
        )}
      </div>

      {!noSyllabus && loaded && (
        <div className="fixed inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pointer-events-none">
          <div className="max-w-sm mx-auto pointer-events-auto">
            <button onClick={save} disabled={saving || pickedCount === 0}
              className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-transform shadow-lg">
              {saving ? 'Adding…' : pickedCount ? `Add ${pickedCount} chapter${pickedCount > 1 ? 's' : ''} to my plan` : 'Tap chapters to add'}
            </button>
          </div>
        </div>
      )}
    </div></AppShell>
  )
}
