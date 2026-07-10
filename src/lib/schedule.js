// The revision schedule — the 5-review cycle every topic gets by default, and
// the labels used for custom intervals. Shared by AddTopic, TopicDetail and the
// shared-topic clone so a topic's schedule reads the same wherever it's built.

export const STANDARD_OFFSETS = [
  { label: 'same_day', days: 0 },
  { label: '1_day', days: 1 },
  { label: '1_week', days: 7 },
  { label: '1_month', days: 30 },
  { label: '4_months', days: 120 }
]

export function labelForOffset(days) {
  if (days === 0) return 'same_day'
  if (days === 1) return '1_day'
  return `${days}_days`
}

// Human-readable form of an offset, for the schedule preview.
export const offsetLabel = (days) => (days === 0 ? 'Same day' : `Day ${days}`)

const DAY_MS = 86400000
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Whole days from today to the exam; negative once it has passed. Rounds
// because a DST boundary makes a "day" 23 or 25 hours long.
export function daysUntilExam(examDate, from = new Date()) {
  if (!examDate) return null
  return Math.round((new Date(`${examDate}T00:00:00`) - midnight(from)) / DAY_MS)
}

// The standard schedule, minus the reviews that would land after the exam.
//
// Truncate, never compress. Dropping a review that arrives too late is strictly
// an improvement; squeezing five reviews into six weeks changes the spacing the
// whole method rests on, and that deserves its own thinking.
//
// A date in the past means the exam is over and the field is stale. Fall back
// to the full schedule rather than quietly reducing every new topic to a single
// same-day review.
export function offsetsFor(examDate, from = new Date()) {
  const left = daysUntilExam(examDate, from)
  if (left === null || left < 0) return STANDARD_OFFSETS
  return STANDARD_OFFSETS.filter(o => o.days <= left)
}

// "Same day, Day 1, Day 7, Day 30" — describes the schedule a topic would
// actually get, so it stays honest once the exam date truncates it.
export const scheduleSummary = (examDate, from) =>
  offsetsFor(examDate, from).map(o => offsetLabel(o.days)).join(', ')
