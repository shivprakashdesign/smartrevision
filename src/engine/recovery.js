// Momentum Engine — how the app treats missed work. Missed revisions are never
// a wall of overdue counts: they form a quiet recovery queue that the mission
// engine reintroduces a slice at a time, and the number the student sees is
// Memory Health, not a backlog tally.

import { computeMemory, topicBucket, nextRevision, intervalToDays } from './metrics'
import { revisionScore } from './scoring'

// A revision's flexible window: Day 7 is honestly "days 6–10", not a deadline.
// ± max(1, 35% of the interval) days around the scheduled date.
export const WINDOW_FRAC = 0.35
export function windowDays(intervalDays) {
  return Math.max(1, Math.round(WINDOW_FRAC * intervalDays))
}

// Is a revision still inside its honest window on `todayISO`? (Not yet due
// counts as inside — the window only stretches, never rushes.)
export function withinWindow(revision, todayISO) {
  if (revision.scheduled_date >= todayISO) return true
  const days = windowDays(intervalToDays(revision.interval_label))
  const late = (new Date(`${todayISO}T00:00:00`) - new Date(`${revision.scheduled_date}T00:00:00`)) / 86400000
  return late <= days
}

// Past this many days missed, a revision isn't a rescue anymore — the topic is
// effectively re-learning, so it ranks purely by exam importance.
export const RELEARN_AFTER_DAYS = 45

// The recovery queue: topics whose next revision was missed, scored so the
// most valuable rescue comes first. `examWeightOf(topic)` supplies blueprint
// weight (0 when unknown). Never rendered as a count — the mission engine
// draws from the front of this queue within its recovery budget.
export function recoveryQueue(topics, { examWeightOf = () => 0, weakSubjects = [], now = new Date() } = {}) {
  const todayISO = now.toISOString().slice(0, 10)
  const weak = new Set(weakSubjects)
  const out = []
  for (const t of topics) {
    const revs = t.revisions || []
    if (topicBucket(revs, todayISO) !== 'missed') continue
    const next = nextRevision(revs)
    const daysMissed = Math.round(
      (new Date(`${todayISO}T00:00:00`) - new Date(`${next.scheduled_date}T00:00:00`)) / 86400000
    )
    const memory = computeMemory(revs, now)
    const examWeight = examWeightOf(t)
    const relearning = daysMissed > RELEARN_AFTER_DAYS && (memory ?? 0) <= 5
    out.push({
      topicId: t.id,
      subject: t.subject,
      label: t.topic_name,
      revisionId: next.id,
      daysMissed,
      memory,
      relearning,
      score: relearning
        ? examWeightOf(t) // re-learning: importance only, decay says nothing new
        : revisionScore({ memory, examWeight, weak: weak.has(t.subject) })
    })
  }
  // Rescues first (by score), re-learning after — coming back shouldn't start
  // with the oldest, coldest material.
  return out.sort((a, b) => (a.relearning !== b.relearning ? (a.relearning ? 1 : -1) : b.score - a.score))
}

// Memory Health: the one number that replaces overdue counts. Average retention
// across topics that have been revised at least once; null until then.
export function memoryHealth(topics, now = new Date()) {
  const vals = topics
    .map((t) => computeMemory(t.revisions || [], now))
    .filter((m) => m != null)
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

// The gentle label for a health value — never alarmed, always actionable.
export function memoryHealthLabel(health) {
  if (health == null) return null
  if (health >= 85) return 'Excellent'
  if (health >= 65) return 'Good'
  return 'Needs attention'
}
