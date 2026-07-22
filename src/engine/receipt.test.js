import { describe, it, expect } from 'vitest'
import { receiptStats, receiptShareText, lastRecallQuality } from './receipt'

// `reps` is an array of recall_quality values, one per completed revision,
// dated in array order (so array order also happens to be date order —
// individual tests override this where the distinction matters).
const rev = (day, quality) => ({ completed: true, scheduled_date: `2026-06-${day}`, recall_quality: quality })
const topic = (id, name, subject, reps) => ({
  id,
  topic_name: name,
  subject,
  revisions: reps.map((quality, i) => rev(String(i + 1).padStart(2, '0'), quality))
})

const TOPICS = [
  topic('a', 'Laws of Motion', 'Physics', ['okay', 'good']), // prepared, tagged, last=good
  topic('b', 'Electricity', 'Physics', []), // prepared? no — zero revisions, tagged
  topic('c', 'Acids and Bases', 'Chemistry', ['struggled']), // prepared, tagged, last=struggled
  topic('d', 'Cell Division', 'Biology', ['good', 'good']) // prepared, NOT tagged — must not appear in rows
]

describe('lastRecallQuality', () => {
  it('is null with nothing graded, and picks the most recent by date otherwise', () => {
    expect(lastRecallQuality([])).toBeNull()
    expect(lastRecallQuality([{ completed: false, recall_quality: 'good', scheduled_date: '2026-06-01' }])).toBeNull()
    // Out-of-array-order dates: must sort, not just take the last element.
    const revs = [
      { completed: true, recall_quality: 'struggled', scheduled_date: '2026-06-10' },
      { completed: true, recall_quality: 'good', scheduled_date: '2026-06-01' }
    ]
    expect(lastRecallQuality(revs)).toBe('struggled')
  })
})

describe('receiptStats', () => {
  it('counts only tagged topics into appeared/revised/rows, but prepared counts ALL revised topics', () => {
    const s = receiptStats(TOPICS, ['a', 'b', 'c'])
    expect(s.appeared).toBe(3) // a, b, c tagged
    expect(s.revised).toBe(2) // a and c have completed revisions; b has none
    expect(s.reps).toBe(3) // a:2 + c:1
    expect(s.prepared).toBe(3) // a, c, d all have completed revisions — d counts even though untagged
  })

  it('computes coverage (of appeared, % revised) and aim (of prepared, % appeared) as rounded percents', () => {
    const s = receiptStats(TOPICS, ['a', 'b', 'c'])
    expect(s.coverage).toBe(67) // 2/3
    expect(s.aim).toBe(67) // revised(2) / prepared(3) — d was prepared but never showed up
  })

  it('buckets confidence from the last graded revision of tagged+revised topics only', () => {
    const s = receiptStats(TOPICS, ['a', 'b', 'c'])
    expect(s.confidence).toEqual({ good: 1, okay: 0, struggled: 1 }) // a→good, c→struggled, b excluded (never revised), d excluded (untagged)
  })

  it('puts revised topics first in the rows, unrevised shown honestly', () => {
    const s = receiptStats(TOPICS, ['b', 'a'])
    expect(s.rows.map((r) => r.id)).toEqual(['a', 'b'])
    expect(s.rows[0]).toMatchObject({ revised: true, reps: 2 })
    expect(s.rows[1]).toMatchObject({ revised: false, reps: 0, subject: 'Physics' })
  })

  it('returns null (not 0) for coverage/aim only when their own denominator is empty', () => {
    // Nothing tagged: appeared=0 → coverage null. But prepared still counts
    // a/c/d (3 topics with real revisions) regardless of tagging, so aim is
    // a real 0%, not null — the student prepared plenty, none of it (yet)
    // confirmed as having appeared.
    expect(receiptStats(TOPICS, [])).toMatchObject({ appeared: 0, revised: 0, coverage: null, prepared: 3, aim: 0 })
    // No topics at all: both denominators are empty.
    expect(receiptStats([], ['x'])).toMatchObject({ appeared: 0, prepared: 0, coverage: null, aim: null })
    // Topic exists and is tagged, but was never revised: appeared=1 (coverage
    // a real 0%), but nothing anywhere was ever prepared, so aim is null.
    const s = receiptStats([topic('x', 'X', 'Physics', [])], ['x'])
    expect(s).toMatchObject({ appeared: 1, coverage: 0, prepared: 0, aim: null })
  })

  it('handles missing fields', () => {
    const s = receiptStats([{ id: 'x', topic_name: 'Loose', revisions: undefined }], ['x'])
    expect(s.rows[0]).toMatchObject({ subject: 'General', revised: false })
  })
})

describe('receiptShareText', () => {
  it('reads like a student wrote it, with coverage and aim in place', () => {
    const text = receiptShareText({ appeared: 11, revised: 9, reps: 31, prepared: 14, aim: 64 })
    expect(text).toContain('9 of the 11 topics')
    expect(text).toContain('31 revisions')
    expect(text).toContain('prepped 14 topics')
    expect(text).toContain('64% of them actually showed up')
    expect(text).toContain('SmartRevision')
  })

  it('drops the aim clause when there is nothing to report', () => {
    const text = receiptShareText({ appeared: 2, revised: 1, reps: 1, prepared: 0, aim: null })
    expect(text).not.toContain('prepped')
  })
})
