import { describe, it, expect } from 'vitest'
import { receiptStats, receiptShareText } from './receipt'

const topic = (id, name, subject, completedReps) => ({
  id,
  topic_name: name,
  subject,
  revisions: Array.from({ length: completedReps + 1 }, (_, i) => ({ completed: i < completedReps }))
})

const TOPICS = [
  topic('a', 'Laws of Motion', 'Physics', 3),
  topic('b', 'Electricity', 'Physics', 0), // never revised
  topic('c', 'Acids and Bases', 'Chemistry', 2),
  topic('d', 'Cell Division', 'Biology', 4) // not tagged — must not count
]

describe('receiptStats', () => {
  it('counts only tagged topics, splits revised vs not, sums their reps', () => {
    const s = receiptStats(TOPICS, ['a', 'b', 'c'])
    expect(s.appeared).toBe(3)
    expect(s.revised).toBe(2)
    expect(s.reps).toBe(5) // 3 + 2, the unrevised topic contributes none
  })

  it('puts revised topics first in the rows', () => {
    const s = receiptStats(TOPICS, ['b', 'a'])
    expect(s.rows.map((r) => r.id)).toEqual(['a', 'b'])
    expect(s.rows[0]).toMatchObject({ revised: true, reps: 3 })
    expect(s.rows[1]).toMatchObject({ revised: false, reps: 0, subject: 'Physics' })
  })

  it('handles empty tagging and missing fields', () => {
    expect(receiptStats(TOPICS, [])).toEqual({ appeared: 0, revised: 0, reps: 0, rows: [] })
    expect(receiptStats(TOPICS, null).appeared).toBe(0)
    const s = receiptStats([{ id: 'x', topic_name: 'Loose', revisions: undefined }], ['x'])
    expect(s.rows[0]).toMatchObject({ subject: 'General', revised: false })
  })
})

describe('receiptShareText', () => {
  it('reads like a student wrote it, with the numbers in place', () => {
    const text = receiptShareText({ appeared: 11, revised: 9, reps: 31 })
    expect(text).toContain('9 of the 11 topics')
    expect(text).toContain('31 revisions')
    expect(text).toContain('SmartRevision')
  })
})
