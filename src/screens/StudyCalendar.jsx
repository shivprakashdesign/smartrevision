// The payoff: the student's picked chapters (plan_items) turned into a weighted
// weekly calendar by the engine (src/lib/studyPlan.js). Time-per-topic comes
// from hardcoded board/JEE importance + subject weakness — never from AI. This
// screen only reads and renders; every decision lives in buildPlan().
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, BookOpen01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { subjectColor } from '../lib/subjects'
import { chapterByName } from '../lib/syllabus'
import { buildPlan } from '../lib/studyPlan'

const BOARD = 'CBSE'
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const fmtDay = (s) => { const d = parseYmd(s); return `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MON[d.getMonth()]}` }
const fmtRange = (a, b) => { const x = parseYmd(a), y = parseYmd(b); return `${x.getDate()} ${MON[x.getMonth()]} – ${y.getDate()} ${MON[y.getMonth()]}` }
const fmtDur = (m) => { m = Math.round(m); if (m < 60) return `${m}m`; const h = Math.floor(m / 60), r = m % 60; return r ? `${h}h ${r}m` : `${h}h` }
const todayISO = () => new Date().toLocaleDateString('en-CA')

// A guidance card for the states where there's nothing to render yet.
function Guide({ title, body, to, cta, icon }) {
  return (
    <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm p-6 text-center">
      <p className="text-[15px] font-bold text-[var(--ink)] mb-1">{title}</p>
      <p className="text-[13.5px] text-[var(--slate-txt)] mb-4">{body}</p>
      <Link to={to} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform">
        {icon && <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />} {cta}
      </Link>
    </div>
  )
}

export default function StudyCalendar() {
  const { student } = useStudentProfile()
  const [items, setItems] = useState(null)

  useEffect(() => {
    if (!student) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('plan_items')
        .select('id, subject, chapter_name, status')
        .eq('student_id', student.id)
        .neq('status', 'done')
      if (!cancelled) setItems(data || [])
    })()
    return () => { cancelled = true }
  }, [student])

  const header = (
    <Link to="/plan" className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--muted)] active:opacity-70 transition-opacity mb-4">
      <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} /> Your plan
    </Link>
  )

  const frame = (children) => (
    <AppShell><div className="px-5 pt-6 pb-10"><div className="max-w-sm mx-auto">
      {header}
      <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mb-1">Your weekly plan</h1>
      <p className="text-[14px] text-[var(--muted)] mb-6">Your time, split across topics by how much they matter and where you're weak.</p>
      {children}
    </div></div></AppShell>
  )

  if (items === null) return frame(<p className="text-[14px] text-[var(--muted)]">Loading…</p>)

  const cls = student?.class_grade ? Number(student.class_grade) : null
  const lens = student?.exam_lens || 'jee'

  // Guidance states, in the order a student fills them in.
  if (!student?.exam_date)
    return frame(<Guide title="Set your exam date" body="The plan works backwards from your exam to decide how much time each topic gets." to="/settings/study-plan" cta="Set exam date" icon={Calendar03Icon} />)
  if (!student?.daily_study_min)
    return frame(<Guide title="Add your daily study time" body="Tell us how long you can study each day and we'll split it across your chapters." to="/settings/study-plan" cta="Set study time" icon={Calendar03Icon} />)
  if (items.length === 0)
    return frame(<Guide title="Pick your chapters" body="Choose the chapters you're studying and we'll build the calendar around them." to="/pick-syllabus" cta="Pick your chapters" icon={BookOpen01Icon} />)

  // Map plan_items back to the tree for weights + subtopics. A scanned chapter
  // not in the tree becomes one generic block (floored weight, minimal time).
  const chapters = items.map(pi => {
    const tree = chapterByName(BOARD, cls, pi.subject, pi.chapter_name)
    if (tree) return { ...tree, subject: pi.subject }
    return {
      id: `pi-${pi.id}`, chapter: pi.chapter_name, subject: pi.subject,
      jeeQ: null, boardMarks: null,
      subtopics: [{ id: `pi-${pi.id}-s`, label: pi.chapter_name, type: 'Concept' }]
    }
  })

  const plan = buildPlan({
    chapters,
    examDate: student.exam_date,
    dailyStudyMin: student.daily_study_min,
    studyDays: student.study_days,
    weakSubjects: student.weak_subjects || [],
    lens
  })

  if (plan === null)
    return frame(<Guide title="Your exam date has passed" body="Update it to build a fresh plan for what's next." to="/settings/study-plan" cta="Update exam date" icon={Calendar03Icon} />)

  if (!plan.feasible) {
    const body = plan.reason === 'no-time'
      ? "Your exam is too close to fit fresh study blocks — put your remaining days into revision instead."
      : "We couldn't build a plan yet. Check your study time and chapters."
    return frame(<Guide title="Not enough time to plan" body={body} to="/settings/study-plan" cta="Adjust study plan" icon={Calendar03Icon} />)
  }

  // Time per subject, for the "why this much" summary.
  const bySubject = {}
  for (const c of plan.perChapter) bySubject[c.subject] = (bySubject[c.subject] || 0) + c.minutes
  const subjectRows = Object.entries(bySubject).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1])

  return frame(
    <div className="space-y-5">
      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm p-4">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[14px] font-bold text-[var(--ink)]">{plan.daysLeft} days to exam</span>
          <span className="text-[12px] font-bold text-brand-500">{lens === 'board' ? 'Board weightage' : 'JEE weightage'}</span>
        </div>
        <p className="text-[12.5px] text-[var(--muted)] mb-3">
          {fmtDur(student.daily_study_min)}/study-day · {plan.studyDays} study days · {fmtDur(plan.totalStudyable)} of focused time before the exam.
        </p>
        <div className="space-y-1.5">
          {subjectRows.map(([subject, m]) => {
            const pct = Math.round(m / plan.totalStudyable * 100)
            return (
              <div key={subject} className="flex items-center gap-2.5">
                <span className="text-[12px] font-bold text-[var(--ink)] w-20 shrink-0 truncate">{subject}</span>
                <span className="flex-1 h-2 rounded-full bg-[var(--card-alt)] overflow-hidden">
                  <span className={`block h-full rounded-full ${subjectColor(subject)}`} style={{ width: `${pct}%` }} />
                </span>
                <span className="text-[11.5px] font-bold text-[var(--muted)] w-14 text-right shrink-0">{fmtDur(m)}</span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Weeks */}
      {plan.weeks.map((wk, wi) => {
        const isThisWeek = wk.start <= todayISO() && todayISO() <= wk.end
        // Group the week's blocks by day for a calendar read.
        const days = {}
        for (const it of wk.items) (days[it.day] || (days[it.day] = [])).push(it)
        return (
          <motion.div key={wk.index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 + wi * 0.04, ease: [0.23, 1, 0.32, 1] }}>
            <div className="flex items-center justify-between px-1.5 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--slate-txt)]">
                {isThisWeek ? 'This week' : `Week ${wk.index + 1}`} · {fmtRange(wk.start, wk.end)}
              </p>
              <span className="text-[11px] font-bold text-[var(--muted)]">{fmtDur(wk.minutes)}</span>
            </div>
            <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm divide-y divide-[var(--border)] overflow-hidden">
              {Object.entries(days).map(([day, dayItems]) => (
                <div key={day} className="p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[12.5px] font-bold text-[var(--ink)]">{fmtDay(day)}</span>
                    <span className="text-[11px] font-bold text-[var(--muted)]">{fmtDur(dayItems.reduce((a, it) => a + it.minutes, 0))}</span>
                  </div>
                  <div className="space-y-1.5">
                    {dayItems.map(it => (
                      <div key={it.subtopicId} className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${subjectColor(it.subject)} shrink-0`} />
                        <span className="text-[13px] text-[var(--ink)] flex-1 min-w-0 leading-snug">
                          {it.label} <span className="text-[var(--muted)]">· {it.chapter}</span>
                        </span>
                        <span className="text-[11.5px] font-bold text-[var(--muted)] shrink-0">{fmtDur(it.minutes)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}

      {/* Dropped — honest overflow */}
      {plan.dropped.length > 0 && (
        <div className="bg-[var(--card-alt)] rounded-3xl border border-[var(--border)] p-4">
          <p className="text-[12px] font-bold text-[var(--ink)] mb-1">Won't fit before your exam</p>
          <p className="text-[12px] text-[var(--muted)] mb-2">
            {plan.dropped.length} lower-weightage {plan.dropped.length === 1 ? 'topic' : 'topics'} didn't make the cut. Add study time or move your exam date to fit more.
          </p>
          <p className="text-[12px] text-[var(--slate-txt)]">
            {[...new Set(plan.dropped.map(d => d.chapter))].slice(0, 6).join(', ')}
          </p>
        </div>
      )}

      <Link to="/settings/study-plan" className="block text-center text-[12px] font-bold text-brand-500 active:opacity-70 pt-1">
        Change your time, weak subjects or lens
      </Link>
    </div>
  )
}
