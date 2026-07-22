import { describe, it, expect } from 'vitest'
import { STANDARD_OFFSETS, buildRevisionRows, offsetsFor, daysUntilExam } from './schedule'

// Noon, not midnight: the row builder date-stamps via toISOString() (UTC),
// matching shipped behavior, so midnight fixtures would shift by timezone.
const may1 = new Date(2026, 4, 1, 12)

describe('buildRevisionRows', () => {
  it('builds one row per offset, dated from the given day', () => {
    const rows = buildRevisionRows('t1', STANDARD_OFFSETS, may1)
    expect(rows).toHaveLength(5)
    expect(rows[0]).toEqual({ topic_id: 't1', scheduled_date: '2026-05-01', interval_label: 'same_day' })
    expect(rows[2]).toEqual({ topic_id: 't1', scheduled_date: '2026-05-08', interval_label: '1_week' })
    expect(rows[4].scheduled_date).toBe('2026-08-29') // day 120
  })

  it('crosses month boundaries via real date math, not day arithmetic', () => {
    const rows = buildRevisionRows('t1', [{ label: '1_month', days: 30 }], new Date(2026, 0, 15, 12))
    expect(rows[0].scheduled_date).toBe('2026-02-14')
  })

  it('carries custom labels through untouched', () => {
    const rows = buildRevisionRows('t1', [{ label: '12_days', days: 12 }], may1)
    expect(rows[0]).toEqual({ topic_id: 't1', scheduled_date: '2026-05-13', interval_label: '12_days' })
  })
})

describe('offsetsFor + buildRevisionRows', () => {
  it('a truncated schedule never schedules past the exam', () => {
    const rows = buildRevisionRows('t1', offsetsFor('2026-05-10', may1), may1)
    expect(rows.map(r => r.interval_label)).toEqual(['same_day', '1_day', '1_week'])
    for (const r of rows) expect(r.scheduled_date <= '2026-05-10').toBe(true)
  })

  it('daysUntilExam counts whole local days', () => {
    expect(daysUntilExam('2026-05-10', may1)).toBe(9)
    expect(daysUntilExam(null, may1)).toBe(null)
  })
})
