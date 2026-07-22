// Derived metrics for the home dashboard. All pure functions over the
// `revisions` rows we already store — no new schema. See the redesign spec:
// Memory% is the forgetting-curve y-axis, Gems are awarded server-side.

import { STANDARD_OFFSETS } from './schedule'

const KNOWN_INTERVALS = Object.fromEntries(
  STANDARD_OFFSETS.map(o => [o.label, o.days])
)

// Interval label → number of days. Handles the standard cycle plus custom
// "<n>_days" / "<n>_day" labels produced by custom schedules.
export function intervalToDays(label) {
  if (label == null) return 7
  if (label in KNOWN_INTERVALS) return KNOWN_INTERVALS[label]
  const m = String(label).match(/^(\d+)_days?$/)
  return m ? parseInt(m[1], 10) : 7
}

const DAY_MS = 86400000
const todayISO = () => new Date().toISOString().slice(0, 10)

function daysBetween(aISO, bISO) {
  return (new Date(`${bISO}T00:00:00`) - new Date(`${aISO}T00:00:00`)) / DAY_MS
}

function sortBySchedule(revs) {
  return [...revs].sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1))
}

// Completion progress for a topic's revision cycle.
export function completion(revisions) {
  const total = revisions.length
  const done = revisions.filter(r => r.completed).length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

// The next actionable (incomplete) revision, earliest first.
export function nextRevision(revisions) {
  return sortBySchedule(revisions.filter(r => !r.completed))[0] || null
}

// Which home tab a topic belongs to, based on its next incomplete revision.
//   due      → next revision is scheduled for today
//   missed   → next revision's date is in the past (overdue)
//   upcoming → next revision is in the future
//   done     → no incomplete revisions left
export function topicBucket(revisions, today = todayISO()) {
  const next = nextRevision(revisions)
  if (!next) return 'done'
  if (next.scheduled_date < today) return 'missed'
  if (next.scheduled_date === today) return 'due'
  return 'upcoming'
}

// A topic is "on track" unless it has an incomplete revision already in the past.
export function isOnTrack(revisions, today = todayISO()) {
  return !revisions.some(r => !r.completed && r.scheduled_date < today)
}

// Estimated current retention = the forgetting-curve y-axis.
//   memory% = 100 · exp(−Δt / stability)
//   Δt        = days since the last completed revision
//   stability = length of the current interval, scaled by last recall quality
// Returns null when nothing has been revised yet (topic is "New").
export function computeMemory(revisions, now = new Date()) {
  const completed = sortBySchedule(revisions.filter(r => r.completed))
  if (completed.length === 0) return null

  const last = completed[completed.length - 1]
  const lastDoneISO = (last.completed_at || last.scheduled_date).slice(0, 10)
  const dt = Math.max(0, (now - new Date(`${lastDoneISO}T00:00:00`)) / DAY_MS)

  // Stability = spacing of the current interval (last completed → next due),
  // falling back to the label's own length once the cycle is finished.
  const next = nextRevision(revisions)
  let stability = next
    ? daysBetween(last.scheduled_date, next.scheduled_date)
    : intervalToDays(last.interval_label)
  stability = Math.max(1, stability)

  const qMult = { good: 1.2, okay: 1.0, struggled: 0.6 }[last.recall_quality] ?? 1.0
  stability *= qMult

  const mem = 100 * Math.exp(-dt / stability)
  return Math.round(Math.min(100, Math.max(0, mem)))
}

// Set of ISO dates on which at least one revision was completed — i.e. the days
// that count toward the streak. Powers the streak sheet's week row.
export function activeDates(topics) {
  const set = new Set()
  for (const t of topics) {
    for (const r of t.revisions || []) {
      if (r.completed) set.add((r.completed_at ? String(r.completed_at) : r.scheduled_date).slice(0, 10))
    }
  }
  return set
}

// Per-day markers for the week strip, driven by each topic's NEXT actionable
// revision (one per topic) so the calendar agrees with the Due/Missed/Upcoming
// buckets — today's `due` count always equals the Due Today tab.
//   due    → topic's next incomplete revision falls on this (today/future) day
//   missed → topic's next incomplete revision is overdue on this past day
//   done   → a revision was actually completed on this day
export function dayMarkers(topics, today = todayISO()) {
  const map = {}
  const ensure = d => (map[d] || (map[d] = { due: 0, missed: 0, done: 0 }))
  for (const t of topics) {
    const revs = t.revisions || []
    // "Done" ticks land on the day the revision was actually completed.
    for (const r of revs) {
      if (r.completed) {
        const d = r.completed_at ? String(r.completed_at).slice(0, 10) : r.scheduled_date
        ensure(d).done++
      }
    }
    // A topic contributes exactly one due/missed marker: its next actionable step.
    const next = nextRevision(revs)
    if (next) {
      if (next.scheduled_date < today) ensure(next.scheduled_date).missed++
      else ensure(next.scheduled_date).due++
    }
  }
  return map
}

// Collapse a day's markers into a single badge. Actionable state wins: an
// outstanding due/missed item matters more than a tick earned earlier.
export function dayStatus(entry) {
  if (!entry) return { kind: 'empty' }
  if (entry.due > 0) return { kind: 'due', count: entry.due }
  if (entry.missed > 0) return { kind: 'missed' }
  if (entry.done > 0) return { kind: 'done' }
  return { kind: 'empty' }
}

// Count of revisions actually completed on each ISO day. Powers the Progress
// activity heatmap. Keyed by completion day (falls back to scheduled_date).
export function completedByDay(topics) {
  const map = {}
  for (const t of topics) {
    for (const r of t.revisions || []) {
      if (!r.completed) continue
      const d = (r.completed_at ? String(r.completed_at) : r.scheduled_date).slice(0, 10)
      map[d] = (map[d] || 0) + 1
    }
  }
  return map
}

// Longest run of consecutive active days in a set of ISO dates (from
// `activeDates`). This is the student's best-ever streak — we don't store it.
export function longestStreak(dates) {
  if (!dates || dates.size === 0) return 0
  const sorted = [...dates].sort()
  let best = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round(daysBetween(sorted[i - 1], sorted[i]))
    if (gap === 1) run++
    else if (gap !== 0) run = 1
    if (run > best) best = run
  }
  return best
}

// Tally recall self-ratings across every graded, completed revision.
export function recallBreakdown(topics) {
  const b = { good: 0, okay: 0, struggled: 0, total: 0 }
  for (const t of topics) {
    for (const r of t.revisions || []) {
      if (r.completed && r.recall_quality && r.recall_quality in b) {
        b[r.recall_quality]++
        b.total++
      }
    }
  }
  return b
}

// Average estimated memory% per subject, over the topics that have been revised
// at least once. Sorted strongest-first for the Progress subject bars.
export function memoryBySubject(topics) {
  const groups = {}
  for (const t of topics) {
    const mem = computeMemory(t.revisions || [])
    if (mem == null) continue
    const key = t.subject || 'General'
    ;(groups[key] || (groups[key] = [])).push(mem)
  }
  return Object.entries(groups)
    .map(([subject, mems]) => ({
      subject,
      count: mems.length,
      memory: Math.round(mems.reduce((a, b) => a + b, 0) / mems.length)
    }))
    .sort((a, b) => b.memory - a.memory)
}

// Roll a list of topics (each with a nested `revisions` array) into the three
// home buckets plus the summary counts used in the greeting line.
export function summarize(topics, today = todayISO()) {
  const buckets = { due: [], missed: [], upcoming: [], done: [] }
  const inProgressSubjects = new Set()

  for (const t of topics) {
    const revs = t.revisions || []
    buckets[topicBucket(revs, today)].push(t)
    const { done, total } = completion(revs)
    if (done > 0 && done < total && t.subject) inProgressSubjects.add(t.subject)
  }

  return {
    buckets,
    counts: {
      due: buckets.due.length,
      missed: buckets.missed.length,
      upcoming: buckets.upcoming.length,
      inProgressSubjects: inProgressSubjects.size
    }
  }
}

// A calm read on whether the student's *pace* is sustainable — not how much
// they've done, but whether the load has tipped into backlog or cramming. Every
// signal is derived from the revision rows we already store; nothing is
// self-reported. Returns null when there isn't enough happening to have an
// honest opinion, so the caller can simply hide the card.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export function studyBalance(topics, now = new Date()) {
  const today = todayISO()

  // 1. Backlog pressure — topics whose next actionable revision is already past.
  const overdue = topics.filter(t => topicBucket(t.revisions || [], today) === 'missed').length

  // 2 & 3. One pass over completed revisions for late-night load + day bunching.
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 6)
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13)
  const perDay = {}
  let lateNight = 0
  let completedRecent = 0

  for (const t of topics) {
    for (const r of t.revisions || []) {
      if (!r.completed || !r.completed_at) continue
      const raw = String(r.completed_at)
      const when = new Date(raw)
      if (isNaN(when.getTime())) continue

      // Bunching: reviews per calendar day over the last 14 days.
      if (when >= twoWeeksAgo) {
        const iso = raw.slice(0, 10)
        perDay[iso] = (perDay[iso] || 0) + 1
        completedRecent++
      }

      // Late-night: only rows with a real time component (11pm–5am, last 7 days).
      if (raw.includes('T') && when >= weekAgo) {
        const h = when.getHours()
        if (h >= 23 || h < 5) lateNight++
      }
    }
  }

  // Busiest single day in the window (drives the cramming signal).
  let busiest = { count: 0, day: null }
  for (const [iso, count] of Object.entries(perDay)) {
    if (count > busiest.count) {
      busiest = { count, day: WEEKDAYS[new Date(`${iso}T00:00:00`).getDay()] }
    }
  }

  // Not enough load to say anything meaningful — let the caller skip the card.
  if (overdue === 0 && completedRecent < 4) return null

  // Score = 100 minus gentle, capped penalties. Higher = more balanced. Bands
  // share the 67/40 thresholds the rest of Progress uses for memory colour.
  const overduePenalty = clamp(overdue * 6, 0, 45)
  const lateNightPenalty = clamp(lateNight * 5, 0, 25)
  const bunchingPenalty = clamp((busiest.count - 6) * 3, 0, 20)
  const score = clamp(Math.round(100 - overduePenalty - lateNightPenalty - bunchingPenalty), 0, 100)
  const band = score >= 67 ? 'balanced' : score >= 40 ? 'busy' : 'overloaded'

  return { score, band, overdue, lateNight, busiest }
}
