// Exam-day memory forecast. Pure simulation over the same `revisions` rows
// metrics.js reads — no new schema. computeMemory() already evaluates the
// forgetting curve at any `now`; forecasting is evaluating it AT the exam
// date under two scenarios:
//   planned   — the student completes their remaining scheduled reviews
//   ifStopped — no more reviews ever happen (pure decay)
// The gap between the two is the number the Home card exists to show.
//
// Model honesty notes:
// - Simulated reviews inherit the topic's most recent self-graded recall
//   quality (fallback 'okay'), never 'good' — the forecast must not flatter.
// - Reviews scheduled on/after exam day are never simulated: a rep you'd do
//   the morning of the exam can't be counted on, and counting it would pin
//   every forecast at ~100%.
// - Missed reviews are assumed recovered *today*, so `planned` always shows
//   the recoverable future rather than punishing the past.

import { computeMemory } from './metrics'
import { daysUntilExam } from './schedule'

// Local calendar date, matching schedule.js's local-midnight day math.
// (metrics.js's internal default uses the UTC date; here every date is passed
// explicitly, and a forecast spanning weeks shouldn't skew a day on IST.)
function isoDay(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const avg = xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)

// Most recent self-graded quality, by schedule order — what we assume future
// reviews of this topic will feel like.
function lastGradedQuality(revisions) {
  const graded = revisions
    .filter(r => r.completed && r.recall_quality)
    .sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1))
  return graded.length ? graded[graded.length - 1].recall_quality : 'okay'
}

// The "planned" world: every incomplete review that lands before exam day is
// completed — future ones on their scheduled date, overdue ones today.
// Exported for tests and the Phase-2 forecast sheet.
export function simulatePlan(revisions, examISO, todayStr) {
  const quality = lastGradedQuality(revisions)
  return revisions.map(r => {
    if (r.completed || r.scheduled_date >= examISO) return r
    const doneOn = r.scheduled_date < todayStr
      ? (todayStr < examISO ? todayStr : null) // can't recover a miss on/after exam day
      : r.scheduled_date
    if (!doneOn) return r
    return { ...r, completed: true, completed_at: doneOn, recall_quality: quality }
  })
}

// Per-topic projection at exam day. Returns null when there's no usable exam
// date (unset or already past — same staleness rule as offsetsFor). Either
// field is null when the scenario has no completed review to decay from.
export function forecastTopic(revisions, examISO, now = new Date()) {
  const left = daysUntilExam(examISO, now)
  if (left === null || left < 0) return null
  const examDate = new Date(`${examISO}T00:00:00`)
  const ifStopped = computeMemory(revisions, examDate)
  let planned = computeMemory(simulatePlan(revisions, examISO, isoDay(now)), examDate)
  // Guardrail: doing the remaining reviews can never project worse than
  // abandoning them. The naive simulation can say otherwise when a short
  // late review (e.g. a struggled-rep 'extra') truncates the stability the
  // schedule had already earned — that's an artifact of stability being the
  // last interval's length, not a real prediction.
  if (planned != null && ifStopped != null && planned < ifStopped) planned = ifStopped
  return { planned, ifStopped }
}

// The post-session moment: what completing `revisionId` at `quality` just did
// to this topic. Current memory snaps back to ~100 (they've just seen it);
// the exam-day forecast is recomputed with the completion — and, for a
// struggled rep, the rescue review scheduled at `extraISO` — folded in.
export function sessionResult(revisions, revisionId, quality, examISO = null, extraISO = null, now = new Date()) {
  const today = isoDay(now)
  const after = revisions.map(r =>
    r.id === revisionId
      ? { ...r, completed: true, completed_at: today, recall_quality: quality }
      : r
  )
  if (extraISO) {
    after.push({
      id: `extra-${revisionId}`,
      scheduled_date: extraISO,
      interval_label: 'extra',
      completed: false,
      completed_at: null,
      recall_quality: null
    })
  }
  return {
    memBefore: computeMemory(revisions, now),
    memAfter: computeMemory(after, now),
    forecast: forecastTopic(after, examISO, now)?.planned ?? null,
    examDaysLeft: daysUntilExam(examISO, now)
  }
}

// Subject rollup for the forecast sheet, weakest planned-forecast first (it's
// a triage list). `unrevised` counts topics with no completed review yet —
// they're reported, never averaged in as fake zeros.
export function forecastBySubject(topics, examISO, now = new Date()) {
  const groups = {}
  for (const t of topics) {
    const revs = t.revisions || []
    const f = forecastTopic(revs, examISO, now)
    if (!f) return [] // no usable exam date — same for every topic
    const key = t.subject || 'General'
    const g = groups[key] || (groups[key] = { count: 0, unrevised: 0, planned: [], ifStopped: [] })
    g.count++
    if (!revs.some(r => r.completed)) g.unrevised++
    if (f.planned != null) g.planned.push(f.planned)
    if (f.ifStopped != null) g.ifStopped.push(f.ifStopped)
  }
  return Object.entries(groups)
    .map(([subject, g]) => ({
      subject,
      count: g.count,
      unrevised: g.unrevised,
      planned: g.planned.length ? avg(g.planned) : null,
      ifStopped: g.ifStopped.length ? avg(g.ifStopped) : null
    }))
    .sort((a, b) => (a.planned ?? 101) - (b.planned ?? 101))
}

// The Home-card numbers. `planned` averages every topic the plan can reach;
// `ifStopped` averages only topics revised at least once — the two aren't
// over identical sets, which is the honest read (an untouched topic has no
// decay curve to stop).
export function forecastOverall(topics, examISO, now = new Date()) {
  const daysLeft = daysUntilExam(examISO, now)
  if (daysLeft === null || daysLeft < 0) return null
  let unrevised = 0
  const planned = []
  const stopped = []
  for (const t of topics) {
    const revs = t.revisions || []
    if (!revs.some(r => r.completed)) unrevised++
    const f = forecastTopic(revs, examISO, now)
    if (f?.planned != null) planned.push(f.planned)
    if (f?.ifStopped != null) stopped.push(f.ifStopped)
  }
  return {
    planned: planned.length ? avg(planned) : null,
    ifStopped: stopped.length ? avg(stopped) : null,
    unrevised,
    daysLeft
  }
}

// The "revise these first" list for the forecast sheet: the topics the plan
// still leaves weakest on exam day, weakest first.
export function weakestTopics(topics, examISO, n = 3, now = new Date()) {
  return topics
    .map(t => ({ t, f: forecastTopic(t.revisions || [], examISO, now) }))
    .filter(x => x.f && x.f.planned != null)
    .sort((a, b) => a.f.planned - b.f.planned)
    .slice(0, n)
    .map(x => ({
      id: x.t.id,
      name: x.t.topic_name,
      subject: x.t.subject || 'General',
      planned: x.f.planned
    }))
}

// Everything the Home forecast card needs, as one state machine — the
// component stays a dumb renderer. States:
//   no-exam — no exam date set: the card becomes the CTA to set one
//   hidden  — exam date is in the past (stale): show nothing
//   locked  — exam set but fewer than 3 topics revised: a percentage built on
//             1–2 curves is noise, so show the countdown and what unlocks it
//   ready   — countdown + numbers, plus `today` for the delta line
export const FORECAST_MIN_REVISED = 3

export function forecastCard(topics, examISO, now = new Date()) {
  const daysLeft = daysUntilExam(examISO, now)
  if (daysLeft === null) return { state: 'no-exam' }
  if (daysLeft < 0) return { state: 'hidden' }

  const revised = topics.filter(t => (t.revisions || []).some(r => r.completed)).length
  if (revised < FORECAST_MIN_REVISED) {
    return { state: 'locked', daysLeft, needed: FORECAST_MIN_REVISED - revised }
  }

  const overall = forecastOverall(topics, examISO, now)
  if (overall.planned == null) return { state: 'locked', daysLeft, needed: FORECAST_MIN_REVISED }
  return { state: 'ready', ...overall, today: todayDelta(topics, examISO, now) }
}

// Marginal value of today's actionable reviews (due today or overdue):
// complete them today vs. drop them entirely while keeping the rest of the
// plan. A topic that would be left with nothing counts as 0 in the skip
// scenario — skipping your only review of a topic leaves the system nothing
// to hold onto.
//
// Model caveat, deliberate: stability here is the current interval's length,
// not accumulated history, so a mid-cycle rep whose later reps still happen
// moves the exam-day number very little. The delta therefore concentrates on
// overdue final reps, first reps of untouched topics, and the last rep before
// the exam — which is exactly the triage order that matters. When the delta
// is ~0, the card should lean on the planned-vs-ifStopped gap instead.
export function todayDelta(topics, examISO, now = new Date()) {
  const left = daysUntilExam(examISO, now)
  if (left === null || left < 0) return null
  const todayStr = isoDay(now)
  let count = 0
  const withToday = []
  const without = []
  for (const t of topics) {
    const revs = t.revisions || []
    const f = forecastTopic(revs, examISO, now)
    if (!f || f.planned == null) continue
    const kept = revs.filter(r => r.completed || r.scheduled_date > todayStr)
    withToday.push(f.planned)
    if (kept.length === revs.length) {
      without.push(f.planned)
      continue
    }
    count += revs.length - kept.length
    const alt = forecastTopic(kept, examISO, now)
    without.push(alt?.planned ?? 0)
  }
  if (!withToday.length) return { count: 0, delta: 0, planned: null }
  const planned = avg(withToday)
  return { count, delta: planned - avg(without), planned }
}
