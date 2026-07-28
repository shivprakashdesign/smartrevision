// Pins the inferred-weakness decisions the way mission.test.js pins the planner:
// struggled history → weak, good history → not weak, cold-start falls back to
// self-report, inference only ever ADDS, and recent grades outweigh old ones.
import { describe, it, expect } from 'vitest'
import {
  topicWeakness, inferWeakSubjects,
  WEAK_THRESHOLD, MIN_REVISED_FOR_INFERENCE
} from './weakness'

const NOW = new Date('2026-07-27T12:00:00')

// A revised topic: `grades` are the recall qualities of its completed reviews,
// oldest→newest, each spaced a week apart ending `daysAgo` before NOW.
let seq = 0
function topic({ subject = 'Physics', grades = [], daysAgo = 3 }) {
  seq += 1
  const revs = grades.map((q, i) => {
    const d = new Date(NOW)
    d.setDate(d.getDate() - daysAgo - (grades.length - 1 - i) * 7)
    const iso = d.toISOString().slice(0, 10)
    return { id: `t${seq}r${i}`, scheduled_date: iso, completed_at: `${iso}T10:00:00`, completed: true, interval_label: '1_week', recall_quality: q }
  })
  // One upcoming incomplete review so computeMemory has a "current interval".
  const next = new Date(NOW); next.setDate(next.getDate() + 20)
  revs.push({ id: `t${seq}rn`, scheduled_date: next.toISOString().slice(0, 10), completed: false, interval_label: '1_month' })
  return { id: `t${seq}`, subject, topic_name: `Topic ${seq}`, revisions: revs }
}

describe('topicWeakness', () => {
  it('is null until a topic has a graded revision', () => {
    expect(topicWeakness([], NOW)).toBe(null)
    expect(topicWeakness([{ id: 'x', scheduled_date: '2026-07-27', completed: false }], NOW)).toBe(null)
  })

  it('a run of struggles reads weak; a run of goods reads strong', () => {
    const weak = topicWeakness(topic({ grades: ['struggled', 'struggled', 'struggled'] }).revisions, NOW)
    const strong = topicWeakness(topic({ grades: ['good', 'good', 'good'] }).revisions, NOW)
    expect(weak).toBeGreaterThan(WEAK_THRESHOLD)
    expect(strong).toBeLessThan(WEAK_THRESHOLD)
    expect(weak).toBeGreaterThan(strong)
  })

  it('weights recent grades over old ones (same grades, order flips the read)', () => {
    // Identical multiset {1 struggled, 1 good} — only the recency differs.
    const improving = topicWeakness(topic({ grades: ['struggled', 'good'] }).revisions, NOW)
    const worsening = topicWeakness(topic({ grades: ['good', 'struggled'] }).revisions, NOW)
    expect(worsening).toBeGreaterThan(improving)
  })
})

describe('inferWeakSubjects', () => {
  it('cold start (no history) returns exactly the self-reported set', () => {
    expect(inferWeakSubjects([], { selfReported: ['Chemistry'], now: NOW })).toEqual(['Chemistry'])
    expect(inferWeakSubjects([topic({ grades: [] })], { now: NOW })).toEqual([])
  })

  it('marks a subject weak once enough of its topics struggle', () => {
    const topics = [
      topic({ subject: 'Physics', grades: ['struggled', 'struggled'] }),
      topic({ subject: 'Physics', grades: ['struggled', 'okay'] }),
      topic({ subject: 'Chemistry', grades: ['good', 'good'] }),
      topic({ subject: 'Chemistry', grades: ['good', 'good'] })
    ]
    const weak = inferWeakSubjects(topics, { now: NOW })
    expect(weak).toContain('Physics')
    expect(weak).not.toContain('Chemistry')
  })

  it(`needs at least ${MIN_REVISED_FOR_INFERENCE} revised topics before trusting inference`, () => {
    // One badly-struggled topic isn't enough on its own.
    const weak = inferWeakSubjects([topic({ subject: 'Maths', grades: ['struggled', 'struggled', 'struggled'] })], { now: NOW })
    expect(weak).not.toContain('Maths')
  })

  it('only ever ADDS to self-report; never drops a manual pick', () => {
    const topics = [
      topic({ subject: 'Physics', grades: ['struggled', 'struggled'] }),
      topic({ subject: 'Physics', grades: ['struggled', 'struggled'] })
    ]
    // Biology is self-reported with no data; Physics is inferred. Both survive.
    const weak = inferWeakSubjects(topics, { selfReported: ['Biology'], now: NOW })
    expect(weak).toEqual(expect.arrayContaining(['Biology', 'Physics']))
    expect(weak).toHaveLength(2)
  })
})
