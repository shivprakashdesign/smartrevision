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
