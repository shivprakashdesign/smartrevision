// Learning Intelligence — study consistency. We ask "how long can you study
// today?" and, until now, never checked what actually happened. This closes
// that loop: over the days a student actually planned, how much of the planned
// time did they keep?
//
//   consistency = mean( min(actual / planned, 1) ) over planned days
//
// Capped at 1 on purpose: a marathon Sunday shouldn't paper over four skipped
// days — consistency is about showing up, not total hours. Days with no plan
// are ignored rather than counted as zero: a rest day is not a failure, and the
// app never punishes a missed day (see docs/architecture.md invariants).

const DAY_MS = 86400000

export const CONSISTENCY_WINDOW_DAYS = 7
// Below this the copy nudges gently; at or above it we simply say "solid".
export const CONSISTENCY_GOOD = 75

// `missions` are rows with { mission_date, available_min, actual_min }.
// Returns 0..100, or null when nothing in the window has been logged yet.
export function consistencyScore(missions, { now = new Date(), days = CONSISTENCY_WINDOW_DAYS } = {}) {
  const since = new Date(now.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  const kept = []
  for (const m of missions || []) {
    if (!m || m.mission_date < since || m.mission_date > today) continue
    const planned = Number(m.available_min) || 0
    if (planned <= 0) continue
    if (m.actual_min == null) continue // un-logged day: unknown, not zero
    kept.push(Math.min(Number(m.actual_min) / planned, 1))
  }
  if (!kept.length) return null
  return Math.round((kept.reduce((a, b) => a + b, 0) / kept.length) * 100)
}

// A short, non-judgemental read on the score. Never scolds — a low number is
// information, not a verdict.
export function consistencyLabel(score) {
  if (score == null) return null
  if (score >= CONSISTENCY_GOOD) return 'Right on your plan'
  if (score >= 50) return 'Close to your plan'
  return 'Plans are running long'
}
