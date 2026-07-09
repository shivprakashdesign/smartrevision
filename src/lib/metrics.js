// Derived metrics for the home dashboard. All pure functions over the
// `revisions` rows we already store — no new schema. See the redesign spec:
// Memory% is the forgetting-curve y-axis, Gems are awarded server-side.

const KNOWN_INTERVALS = {
  same_day: 0,
  '1_day': 1,
  '1_week': 7,
  '1_month': 30,
  '4_months': 120
}

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
