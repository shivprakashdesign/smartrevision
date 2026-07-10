import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { useSchoolSearch, createSchool, findOrCreateClass, classSchool, schoolSubtitle } from '../lib/schools'
import { offsetsFor, offsetLabel, daysUntilExam, STANDARD_OFFSETS } from '../lib/schedule'

const GRADES = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const STUDY_DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']]

const todayISO = () => new Date().toLocaleDateString('en-CA')
const listAnd = (xs) =>
  xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

function Section({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
      className="mb-5"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--slate-txt)] px-1.5 mb-2">{title}</p>
      <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm p-4">{children}</div>
    </motion.div>
  )
}

export default function StudyPlanSettings() {
  const { student, refreshStudent } = useStudentProfile()

  const [grade, setGrade] = useState(null)
  const [school, setSchool] = useState(null)
  const [schoolQuery, setSchoolQuery] = useState('')
  const [examDate, setExamDate] = useState('')
  const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5, 6])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const { results, searching } = useSchoolSearch(schoolQuery, grade, !school)

  // Seed from the active student. class_id is the source of truth for school +
  // grade; class_grade is a denormalised copy kept in step with it.
  useEffect(() => {
    if (!student || loaded) return
    let cancelled = false
    ;(async () => {
      const current = await classSchool(student.class_id)
      if (cancelled) return
      setGrade(current?.grade ?? (student.class_grade ? Number(student.class_grade) : null))
      setSchool(current?.school ?? null)
      setExamDate(student.exam_date || '')
      setStudyDays(student.study_days?.length ? student.study_days : [1, 2, 3, 4, 5, 6])
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [student, loaded])

  // An empty set would make every gap zero-length and the streak unbreakable.
  function toggleStudyDay(d) {
    if (studyDays.includes(d)) {
      if (studyDays.length === 1) return
      setStudyDays(studyDays.filter(x => x !== d))
    } else {
      setStudyDays([...studyDays, d].sort((a, b) => a - b))
    }
  }

  async function save() {
    if (!student) return
    setSaving(true)

    let schoolId = school?.id || null
    if (school?.pending) {
      const row = await createSchool(school.name)
      if (!row) { toast.error(`Couldn't add ${school.name}`); setSaving(false); return }
      schoolId = row.id
    }

    // Dropping the school drops the class too — otherwise a student would keep
    // ranking on a leaderboard for a school they no longer say they attend.
    const classId = await findOrCreateClass(schoolId, grade)

    const { error } = await supabase.from('students').update({
      class_id: classId,
      class_grade: grade ? String(grade) : null,
      exam_date: examDate || null,
      study_days: studyDays
    }).eq('id', student.id)

    setSaving(false)
    if (error) { toast.error(error.message); return }
    await refreshStudent()
    toast.success('Study plan updated')
  }

  const planned = offsetsFor(examDate || null)
  const dropped = STANDARD_OFFSETS.length - planned.length
  const daysLeft = daysUntilExam(examDate || null)
  const whenExam = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`

  const restDays = STUDY_DAYS.filter(([d]) => !studyDays.includes(d)).map(([, l]) => l)
  const restDayNote = restDays.length === 0
    ? 'Studying every day — any day you miss will break your streak.'
    : `${listAnd(restDays)} ${restDays.length === 1 ? 'is a rest day' : 'are rest days'} — missing ${restDays.length === 1 ? 'it' : 'them'} won't break your streak.`

  const inputClass = 'w-full border-2 border-[var(--border)] rounded-2xl px-4 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:border-brand-500 transition-colors disabled:opacity-50'

  return (
    <AppShell><div className="px-5 pt-6 pb-10">
      <div className="max-w-sm mx-auto">

        <Link to="/settings" className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--muted)] active:opacity-70 transition-opacity mb-4">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} /> Settings
        </Link>

        <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mb-1">Study plan</h1>
        <p className="text-[14px] text-[var(--muted)] mb-6">Your class, your exam and the days you study.</p>

        <Section title="Class">
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {GRADES.map(g => {
              const sel = grade === g
              return (
                <button key={g} onClick={() => { setGrade(sel ? null : g); setSchool(null) }}
                  className={`shrink-0 w-12 h-12 rounded-2xl text-[15px] font-bold border-2 transition-colors ${
                    sel ? 'bg-brand-500 border-brand-500 text-white' : 'border-[var(--border)] text-[var(--ink)]'
                  }`}>
                  {g}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="School" delay={0.05}>
          {school ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold text-[var(--ink)] truncate">{school.name}</p>
                <p className="text-[12px] text-[var(--muted)] truncate">{schoolSubtitle(school) || 'Added by you'}</p>
              </div>
              <button onClick={() => { setSchool(null); setSchoolQuery('') }} className="text-[12px] font-bold text-brand-500 shrink-0">Change</button>
            </div>
          ) : (
            <>
              <input value={schoolQuery} onChange={e => setSchoolQuery(e.target.value)} disabled={!grade}
                placeholder={grade ? 'Search your school' : 'Pick your class first'} className={inputClass} />

              <div className="mt-2 space-y-2">
                {results.map(s => (
                  <button key={s.id} onClick={() => setSchool(s)}
                    className="w-full text-left border-2 border-[var(--border)] rounded-2xl p-3 active:border-brand-500 transition-colors">
                    <p className="text-[14px] font-bold text-[var(--ink)]">{s.name}</p>
                    <p className="text-[12px] text-[var(--muted)]">{schoolSubtitle(s)}</p>
                  </button>
                ))}
              </div>

              {grade && schoolQuery.trim().length >= 2 && !searching && !results.length && (
                <div className="mt-3">
                  <p className="text-[13px] text-[var(--muted)]">No school found for Class {grade}.</p>
                  <button onClick={() => setSchool({ pending: true, name: schoolQuery.trim().replace(/\s+/g, ' ') })}
                    className="text-[13px] font-bold text-brand-500 mt-1">
                    Add "{schoolQuery.trim()}"
                  </button>
                </div>
              )}

              <p className="text-[12px] text-[var(--muted)] mt-3">
                {grade ? 'Leave this empty to drop off your class leaderboard.' : 'Your class and school put you on a leaderboard with your classmates.'}
              </p>
            </>
          )}
        </Section>

        <Section title="Exam date" delay={0.1}>
          <label className="flex items-center justify-between rounded-2xl bg-[var(--card-alt)] px-4 py-3">
            <span className="text-[14.5px] font-bold text-[var(--ink)]">Exam on</span>
            <input type="date" value={examDate} min={todayISO()} onChange={e => setExamDate(e.target.value)}
              className="bg-transparent text-[14.5px] font-bold text-[var(--ink)] focus:outline-none" />
          </label>
          <p className="text-[12px] text-[var(--muted)] mt-3">
            {dropped > 0
              ? `Your exam is ${whenExam}. New topics get ${planned.length} reviews (${planned.map(o => offsetLabel(o.days)).join(', ')}) — we drop the ${dropped === 1 ? 'one that lands' : 'ones that land'} after it.`
              : 'New topics get all five reviews: Same day, Day 1, Day 7, Day 30, Day 120.'}
          </p>
          {examDate && (
            <button onClick={() => setExamDate('')} className="text-[13px] font-bold text-brand-500 mt-2">Clear exam date</button>
          )}
        </Section>

        <Section title="Study days" delay={0.15}>
          <div className="flex gap-1.5">
            {STUDY_DAYS.map(([d, label]) => {
              const sel = studyDays.includes(d)
              return (
                <button key={d} onClick={() => toggleStudyDay(d)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                    sel ? 'bg-brand-500 border-brand-500 text-white' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}>
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-[12px] text-[var(--muted)] mt-3">{restDayNote}</p>
        </Section>

        <button onClick={save} disabled={saving || !loaded}
          className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-transform">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div></AppShell>
  )
}
