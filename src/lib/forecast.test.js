import { describe, it, expect } from 'vitest'
import { simulatePlan, forecastTopic, forecastBySubject, forecastOverall, todayDelta, forecastCard, sessionResult, weakestTopics } from './forecast'

// Frozen clock: local midnight so day maths are whole days. "Today" is 2026-07-15.
const NOW = new Date('2026-07-15T00:00:00')

let nextId = 1
const rev = (scheduled_date, opts = {}) => ({
  id: nextId++,
  scheduled_date,
  interval_label: opts.label ?? '1_week',
  completed: opts.completed ?? false,
  completed_at: opts.completed ? (opts.completed_at ?? scheduled_date) : null,
  recall_quality: opts.quality ?? null
})

// One review done two weeks ago, cycle finished — decay is all that's left.
const decayOnly = () => [rev('2026-07-01', { completed: true, quality: 'okay' })]

// Mid-cycle topic: first review done (graded 'good'), one overdue, one upcoming.
const midCycle = (quality = 'good') => [
  rev('2026-07-10', { completed: true, quality, label: 'same_day' }),
  rev('2026-07-11', { label: '1_day' }),
  rev('2026-07-17', { label: '1_week' })
]

describe('forecastTopic', () => {
  it('with no remaining reviews, planned equals pure decay', () => {
    const f = forecastTopic(decayOnly(), '2026-07-25', NOW)
    // dt=24, stability=7 ('1_week' × okay) → 100·e^(−24/7) ≈ 3
    expect(f).toEqual({ planned: 3, ifStopped: 3 })
  })

  it('completing the plan projects far above stopping today', () => {
    const f = forecastTopic(midCycle(), '2026-08-05', NOW)
    // planned: last simulated review 07-17, dt=19, stability=7×1.2 → ≈10
    // ifStopped: last real review 07-10, dt=26, stability=1×1.2 → ≈0
    expect(f).toEqual({ planned: 10, ifStopped: 0 })
  })

  it('assumed quality carries the last self-grade forward, so struggling lowers the forecast', () => {
    const good = forecastTopic(midCycle('good'), '2026-08-05', NOW)
    const struggled = forecastTopic(midCycle('struggled'), '2026-08-05', NOW)
    expect(struggled.planned).toBeLessThan(good.planned)
    expect(struggled.planned).toBe(1) // stability 7×0.6, dt=19
  })

  it('never counts a review scheduled on exam day', () => {
    const revs = [
      rev('2026-07-10', { completed: true, quality: 'okay', label: 'same_day' }),
      rev('2026-08-05', { label: '1_month' })
    ]
    const f = forecastTopic(revs, '2026-08-05', NOW)
    // The exam-day review stays unsimulated: dt=26, stability=26 → e^−1 ≈ 37, not 100.
    expect(f.planned).toBe(37)
    expect(f.planned).toBe(f.ifStopped)
  })

  it('an unrevised topic has no decay curve to stop, but the plan reaches it', () => {
    const f = forecastTopic([rev('2026-07-16', { label: '1_week' })], '2026-07-25', NOW)
    expect(f.ifStopped).toBeNull()
    expect(f.planned).toBe(28) // simulated 07-16, dt=9, stability=7
  })

  it('returns null without a usable exam date (unset or already past)', () => {
    expect(forecastTopic(decayOnly(), null, NOW)).toBeNull()
    expect(forecastTopic(decayOnly(), '2026-07-01', NOW)).toBeNull()
    expect(forecastTopic(decayOnly(), '2026-07-15', NOW)).not.toBeNull() // exam today still counts
  })

  it('guardrail: completing remaining reviews never projects worse than stopping', () => {
    // A struggled-rep rescue: month-interval review done today, then a short
    // 'extra' review before the exam. Naively the extra's 7-day fallback
    // stability would tank the planned number below pure decay.
    const revs = [
      rev('2026-07-15', { completed: true, quality: 'struggled', label: '1_month' }),
      rev('2026-07-25', { label: 'extra' })
    ]
    const f = forecastTopic(revs, '2026-08-05', NOW)
    expect(f.planned).toBeGreaterThanOrEqual(f.ifStopped)
  })
})

describe('simulatePlan', () => {
  it('recovers overdue reviews today and future ones on schedule, inheriting the last grade', () => {
    const sim = simulatePlan(midCycle('good'), '2026-08-05', '2026-07-15')
    const byDate = Object.fromEntries(sim.map(r => [r.scheduled_date, r]))
    expect(byDate['2026-07-11']).toMatchObject({ completed: true, completed_at: '2026-07-15', recall_quality: 'good' })
    expect(byDate['2026-07-17']).toMatchObject({ completed: true, completed_at: '2026-07-17', recall_quality: 'good' })
  })

  it('leaves completed rows untouched and defaults the assumed grade to okay', () => {
    const revs = [rev('2026-07-10', { completed: true }), rev('2026-07-16')]
    const sim = simulatePlan(revs, '2026-08-05', '2026-07-15')
    expect(sim[0]).toBe(revs[0])
    expect(sim[1].recall_quality).toBe('okay')
  })
})

describe('forecastOverall', () => {
  const topics = [
    { subject: 'Physics', revisions: midCycle() },                              // planned 10, ifStopped 0
    { subject: 'Chemistry', revisions: [rev('2026-07-16', { label: '1_week' })] } // unrevised: planned 6, ifStopped null
  ]

  it('averages planned over every reachable topic, ifStopped only over revised ones', () => {
    const o = forecastOverall(topics, '2026-08-05', NOW)
    expect(o).toEqual({ planned: 8, ifStopped: 0, unrevised: 1, daysLeft: 21 })
  })

  it('is null without a usable exam date', () => {
    expect(forecastOverall(topics, null, NOW)).toBeNull()
    expect(forecastOverall(topics, '2026-07-01', NOW)).toBeNull()
  })

  it('reports nulls, not zeros, when no topic is reachable', () => {
    const o = forecastOverall([{ subject: 'Physics', revisions: [] }], '2026-08-05', NOW)
    expect(o).toEqual({ planned: null, ifStopped: null, unrevised: 1, daysLeft: 21 })
  })
})

describe('forecastBySubject', () => {
  it('groups by subject (General fallback) and sorts weakest planned first', () => {
    const topics = [
      { subject: 'Chemistry', revisions: [
        rev('2026-07-10', { completed: true, quality: 'okay', label: 'same_day' }),
        rev('2026-08-05', { label: '1_month' })
      ] }, // planned 37
      { subject: 'Physics', revisions: midCycle() },                    // planned 10
      { revisions: [rev('2026-07-20', { label: '1_week' })] }           // General, unrevised
    ]
    const rows = forecastBySubject(topics, '2026-08-05', NOW)
    expect(rows.map(r => r.subject)).toEqual(['Physics', 'General', 'Chemistry'])
    expect(rows[0]).toMatchObject({ planned: 10, ifStopped: 0, count: 1, unrevised: 0 })
    expect(rows[1]).toMatchObject({ ifStopped: null, unrevised: 1 })
    expect(rows[2]).toMatchObject({ planned: 37, ifStopped: 37 })
  })

  it('is empty without a usable exam date', () => {
    expect(forecastBySubject([{ revisions: decayOnly() }], null, NOW)).toEqual([])
  })
})

describe('todayDelta', () => {
  it('an overdue final review carries most of the marginal value', () => {
    const topics = [{ revisions: [
      rev('2026-07-01', { completed: true, quality: 'okay' }),
      rev('2026-07-08', { label: '1_month' }) // overdue last rep of the cycle
    ] }]
    // recovered today → 72; dropped for good → decay-only 3
    expect(todayDelta(topics, '2026-07-25', NOW)).toEqual({ count: 1, delta: 69, planned: 72 })
  })

  it("a topic's first-ever review due today counts fully (skip leaves nothing)", () => {
    const topics = [{ revisions: [rev('2026-07-15', { label: '1_week' })] }]
    expect(todayDelta(topics, '2026-07-25', NOW)).toEqual({ count: 1, delta: 24, planned: 24 })
  })

  it('a mid-cycle rep whose later reps still happen moves the exam-day number ~0 (documented model caveat)', () => {
    const topics = [{ revisions: [
      rev('2026-07-10', { completed: true, quality: 'okay', label: 'same_day' }),
      rev('2026-07-15', { label: '5_days' }),
      rev('2026-07-20', { label: '5_days' })
    ] }]
    expect(todayDelta(topics, '2026-07-25', NOW)).toEqual({ count: 1, delta: 0, planned: 37 })
  })

  it('reports zero cleanly when nothing is actionable today', () => {
    const topics = [{ revisions: [
      rev('2026-07-10', { completed: true, quality: 'okay', label: 'same_day' }),
      rev('2026-07-20', { label: '1_week' })
    ] }]
    const d = todayDelta(topics, '2026-07-25', NOW)
    expect(d.count).toBe(0)
    expect(d.delta).toBe(0)
    expect(d.planned).not.toBeNull()
  })

  it('is null without a usable exam date', () => {
    expect(todayDelta([], null, NOW)).toBeNull()
  })
})

describe('weakestTopics', () => {
  it('lists topics weakest-first, capped at n, skipping unreachable ones', () => {
    const topics = [
      { id: 'a', topic_name: 'Strong', subject: 'Chemistry', revisions: [
        rev('2026-07-10', { completed: true, quality: 'okay', label: 'same_day' }),
        rev('2026-08-05', { label: '1_month' })
      ] }, // planned 37
      { id: 'b', topic_name: 'Weak', subject: 'Physics', revisions: midCycle() }, // planned 10
      { id: 'c', topic_name: 'Empty', revisions: [] } // no forecast — skipped
    ]
    const list = weakestTopics(topics, '2026-08-05', 3, NOW)
    expect(list.map(x => x.id)).toEqual(['b', 'a'])
    expect(list[0]).toEqual({ id: 'b', name: 'Weak', subject: 'Physics', planned: 10 })
    expect(weakestTopics(topics, '2026-08-05', 1, NOW)).toHaveLength(1)
    expect(weakestTopics(topics, null, 3, NOW)).toEqual([])
  })
})

describe('sessionResult', () => {
  const cycle = () => [
    rev('2026-07-01', { completed: true, quality: 'okay' }),
    rev('2026-07-15', { label: '1_month' })
  ]

  it('snaps current memory back to 100 and reports the decayed before-value', () => {
    const revs = cycle()
    const res = sessionResult(revs, revs[1].id, 'good', '2026-08-05', null, NOW)
    // before: last done 07-01, next 07-15 → stability 14, dt 14 → e^−1 ≈ 37
    expect(res.memBefore).toBe(37)
    expect(res.memAfter).toBe(100)
    expect(res.examDaysLeft).toBe(21)
    // after: done today at 'good', cycle finished → dt 21, stability 30×1.2 → ≈56
    expect(res.forecast).toBe(56)
  })

  it('a struggled rescue keeps lapse semantics: the topic reads fragile until re-proven', () => {
    // Orthodox SRS: a lapse shrinks stability, so one short rescue rep close
    // to the exam does NOT restore a month-interval topic. The low number is
    // the triage signal the Home card surfaces — which is why the session
    // screen leads with the rescue message, not this number, after a struggle.
    const a = cycle()
    const b = cycle()
    const withExtra = sessionResult(a, a[1].id, 'struggled', '2026-08-05', '2026-07-25', NOW)
    const without = sessionResult(b, b[1].id, 'struggled', '2026-08-05', null, NOW)
    expect(withExtra.forecast).toBeLessThanOrEqual(without.forecast)
    expect(withExtra.forecast).toBeGreaterThan(0)
  })

  it('handles a first-ever revision and a missing exam date', () => {
    const revs = [rev('2026-07-15', { label: '1_day' })]
    const res = sessionResult(revs, revs[0].id, 'okay', null, null, NOW)
    expect(res.memBefore).toBeNull()
    expect(res.memAfter).toBe(100)
    expect(res.forecast).toBeNull()
    expect(res.examDaysLeft).toBeNull()
  })
})

describe('forecastCard', () => {
  const revisedTopic = d => ({ revisions: [rev(d, { completed: true, quality: 'okay' })] })

  it('asks for an exam date when none is set', () => {
    expect(forecastCard([], null, NOW)).toEqual({ state: 'no-exam' })
  })

  it('hides itself once the exam has passed', () => {
    expect(forecastCard([], '2026-07-01', NOW)).toEqual({ state: 'hidden' })
  })

  it('stays locked until 3 topics have been revised', () => {
    const topics = [revisedTopic('2026-07-10'), revisedTopic('2026-07-11'), { revisions: [rev('2026-07-20')] }]
    expect(forecastCard(topics, '2026-08-05', NOW)).toEqual({ state: 'locked', daysLeft: 21, needed: 1 })
  })

  it('is ready with countdown, numbers and the today delta once unlocked', () => {
    const topics = [revisedTopic('2026-07-08'), revisedTopic('2026-07-10'), revisedTopic('2026-07-12')]
    const card = forecastCard(topics, '2026-08-05', NOW)
    expect(card.state).toBe('ready')
    expect(card.daysLeft).toBe(21)
    expect(card.planned).not.toBeNull()
    expect(card.today).toMatchObject({ count: 0 })
  })
})
