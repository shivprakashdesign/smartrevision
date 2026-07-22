// The weighted study-plan engine. Turns "here are the chapters I picked, here's
// my exam date and how long I can study each day" into a weekly calendar where
// time-per-topic is decided by hardcoded board/JEE importance — never by AI.
//
// It works at the SUBTOPIC level, extending the model the student built by hand
// (each subtopic weighted by TYPE — derivations & numericals are heavy) with the
// two things this feature adds:
//   • chapter importance  — jeeQ or boardMarks, via chapterWeight() (the lens)
//   • subject weakness    — a multiplier on chapters in the student's weak subjects
//
//   subtopicWeight = max(chapterWeight, 1) × typeWeight × (weak ? WEAK_MULT : 1)
//
// Every selected subtopic competes for a fixed pool of minutes (study days left
// to the exam × daily minutes, less a buffer), so a nearer exam or fewer hours
// squeezes everything proportionally — and when there genuinely isn't time for
// all of it, the lowest-weight subtopics are dropped rather than starved to a
// useless two minutes each. Sequencing across the calendar stays in syllabus
// (picker) order; importance shows up as important chapters simply occupying
// more days, because they hold more minutes.

import { daysUntilExam } from '../engine/schedule'
import { TYPE_WEIGHT, WEAK_MULT } from '../engine/scoring'
import { chapterWeight } from './syllabus'

const DAY_MS = 86400000

// Tunables — deliberately in one place, because the weights are priors to tune,
// not settled truth (see syllabus.js).
export const BUFFER_FRAC = 0.12        // reserved catch-up/rest slice of each day
export const MIN_SUBTOPIC_MIN = 15     // below this a study block isn't worth planning
// The importance formula's constants live with the shared scoring engine so
// the daily mission and this calendar can never weight the same topic apart.
export { TYPE_WEIGHT, WEAK_MULT } from '../engine/scoring'

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isoDay = (d) => {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
// ISO weekday 1..7 (Mon..Sun), matching students.study_days and schedule maths.
const isoDow = (d) => ((d.getDay() + 6) % 7) + 1

// Every study day from today up to (but not including) exam day, honouring the
// student's rest days. New material isn't planned for the exam day itself.
export function studyDaysUntilExam(examDate, studyDays, now = new Date()) {
  const left = daysUntilExam(examDate, now)
  if (left === null || left < 0) return null
  const allow = new Set(studyDays && studyDays.length ? studyDays : [1, 2, 3, 4, 5, 6, 7])
  const exam = midnight(new Date(`${examDate}T00:00:00`))
  const out = []
  for (let d = midnight(now); d < exam; d = new Date(d.getTime() + DAY_MS)) {
    if (allow.has(isoDow(d))) out.push(isoDay(d))
  }
  return out
}

// The plan. Returns null when the exam date is unusable (unset or already past —
// the same staleness rule as the rest of the app). Otherwise always returns a
// result object; `feasible: false` (with a reason) means there's no usable time
// to plan into, so the caller shows guidance instead of an empty calendar.
export function buildPlan({
  chapters = [],
  examDate,
  dailyStudyMin,
  studyDays = [1, 2, 3, 4, 5, 6, 7],
  weakSubjects = [],
  lens = 'jee',
  now = new Date()
} = {}) {
  const left = daysUntilExam(examDate, now)
  if (left === null || left < 0) return null

  const dayMin = Math.round(Number(dailyStudyMin) || 0)
  if (dayMin <= 0) return { feasible: false, reason: 'no-hours', daysLeft: left, lens, weeks: [], perChapter: [], dropped: [] }

  const days = studyDaysUntilExam(examDate, studyDays, now)
  const dayCapacity = Math.max(0, dayMin - Math.round(dayMin * BUFFER_FRAC))
  const totalStudyable = days.length * dayCapacity
  const today = midnight(now)

  const weak = new Set(weakSubjects || [])

  // Flatten to weighted subtopic items, in syllabus (picker) order.
  const items = []
  for (const ch of chapters) {
    const base = Math.max(chapterWeight(ch, lens), 1) * (weak.has(ch.subject) ? WEAK_MULT : 1)
    for (const st of ch.subtopics || []) {
      items.push({
        chapterId: ch.id,
        chapter: ch.chapter,
        subject: ch.subject || 'General',
        subtopicId: st.id,
        label: st.label,
        type: st.type,
        weight: base * (TYPE_WEIGHT[st.type] || 2)
      })
    }
  }

  if (!items.length || totalStudyable < MIN_SUBTOPIC_MIN) {
    return {
      feasible: false,
      reason: !items.length ? 'no-topics' : 'no-time',
      daysLeft: left, studyDays: days.length, totalStudyable, dayCapacity, lens,
      weeks: [], perChapter: [], dropped: []
    }
  }

  // Feasibility: at most this many subtopics can each get a worthwhile block.
  // Anything past that is dropped — lowest weight first — rather than shrinking
  // every block below the floor. Dropped items keep their syllabus order for a
  // stable, readable "couldn't fit these" list.
  const maxItems = Math.floor(totalStudyable / MIN_SUBTOPIC_MIN)
  const dropSet = new Set()
  if (items.length > maxItems) {
    const byWeight = [...items].sort((a, b) => a.weight - b.weight)
    for (let i = 0; i < items.length - maxItems; i++) dropSet.add(byWeight[i].subtopicId)
  }
  const included = items.filter(it => !dropSet.has(it.subtopicId))
  const dropped = items.filter(it => dropSet.has(it.subtopicId))

  // Give every included subtopic the floor, then split the rest by weight — so a
  // low-weight-but-included block still gets a real slice, and the minutes sum
  // to exactly the studyable pool (the last block absorbs the rounding residual).
  const remainder = totalStudyable - included.length * MIN_SUBTOPIC_MIN
  const wSum = included.reduce((a, it) => a + it.weight, 0)
  let running = 0
  included.forEach((it, i) => {
    if (i === included.length - 1) {
      it.minutes = totalStudyable - running
    } else {
      it.minutes = MIN_SUBTOPIC_MIN + Math.round(remainder * it.weight / wSum)
      running += it.minutes
    }
  })

  // Pack blocks into days in order, opening a new day when the current one would
  // overflow; then group days into 7-day weeks from today.
  const placed = []
  let di = 0
  let used = 0
  for (const it of included) {
    if (used > 0 && used + it.minutes > dayCapacity) { di++; used = 0 }
    const dayIdx = Math.min(di, days.length - 1)
    placed.push({ ...it, day: days[dayIdx], weekIndex: Math.floor((new Date(`${days[dayIdx]}T00:00:00`) - today) / DAY_MS / 7) })
    used += it.minutes
  }

  const weekMap = new Map()
  for (const it of placed) {
    const wk = weekMap.get(it.weekIndex) || { index: it.weekIndex, items: [] }
    wk.items.push(it)
    weekMap.set(it.weekIndex, wk)
  }
  const weeks = [...weekMap.values()].sort((a, b) => a.index - b.index).map(wk => {
    const start = new Date(today.getTime() + wk.index * 7 * DAY_MS)
    return {
      index: wk.index,
      start: isoDay(start),
      end: isoDay(new Date(start.getTime() + 6 * DAY_MS)),
      minutes: wk.items.reduce((a, it) => a + it.minutes, 0),
      items: wk.items
    }
  })

  // Per-chapter rollup for the summary UI (the two lenses live side by side so a
  // screen can show "why this much time"). Included chapters carry their minutes;
  // a fully-dropped chapter is reported at 0 so the student sees what was cut.
  const chapMap = new Map()
  for (const ch of chapters) {
    chapMap.set(ch.id, {
      chapterId: ch.id, chapter: ch.chapter, subject: ch.subject || 'General',
      jeeQ: ch.jeeQ ?? null, boardMarks: ch.boardMarks ?? null,
      weak: weak.has(ch.subject), minutes: 0, droppedSubtopics: 0
    })
  }
  for (const it of included) chapMap.get(it.chapterId).minutes += it.minutes
  for (const it of dropped) chapMap.get(it.chapterId).droppedSubtopics += 1
  const perChapter = [...chapMap.values()]

  return {
    feasible: true,
    lens,
    daysLeft: left,
    studyDays: days.length,
    dayCapacity,
    buffer: dayMin - dayCapacity,
    totalStudyable,
    weeks,
    perChapter,
    dropped: dropped.map(({ chapterId, chapter, subject, subtopicId, label }) => ({ chapterId, chapter, subject, subtopicId, label }))
  }
}
