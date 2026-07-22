// Pins the mission engine's decisions — budget caps, no-guilt recovery
// behavior, CKB-less degradation, deterministic regenerate — the same way
// forecast.test.js pins the memory model.
import { describe, it, expect } from 'vitest'
import { buildMission, itemKey, DUE_CAP, RECOVERY_FRAC, REVISION_MIN_PER_ITEM } from './mission'
import { recoveryQueue, memoryHealth, memoryHealthLabel, windowDays, withinWindow, RELEARN_AFTER_DAYS } from './recovery'
import { newTopicScore, revisionScore, chapterIdOfTopic } from './scoring'

// Noon: revision dates are compared as ISO day strings derived via UTC.
const NOW = new Date('2026-07-22T12:00:00')
const TODAY = '2026-07-22'

let seq = 0
function topic({ subject = 'Physics', name, dates = [], done = 0, quality = 'good', planItemId = null, curriculumTopicId = null }) {
  seq += 1
  return {
    id: `t${seq}`,
    subject,
    topic_name: name ?? `Topic ${seq}`,
    plan_item_id: planItemId,
    curriculum_topic_id: curriculumTopicId,
    revisions: dates.map((d, i) => ({
      id: `t${seq}r${i}`,
      scheduled_date: d,
      interval_label: ['same_day', '1_day', '1_week', '1_month', '4_months'][i] || '1_week',
      completed: i < done,
      completed_at: i < done ? `${d}T10:00:00` : null,
      recall_quality: i < done ? quality : null
    }))
  }
}

const dueTopic = (over = {}) => topic({ dates: ['2026-07-14', '2026-07-15', TODAY], done: 2, ...over })
const missedTopic = (days, over = {}) => {
  const d = new Date(`${TODAY}T12:00:00`); d.setDate(d.getDate() - days)
  return topic({ dates: ['2026-06-01', d.toISOString().slice(0, 10)], done: 1, ...over })
}

const CHAPTER = {
  id: 'p1',
  name: 'Electric Charges and Fields',
  pyqFrequency: 0,
  topics: [
    { id: 'p1.1', name: 'Introduction', type: null, estimatedStudyTimeMin: 25 },
    { id: 'p1.2', name: 'Electric Charge', type: null, estimatedStudyTimeMin: 25 },
    { id: 'p1.3', name: "Coulomb's Law", type: null, estimatedStudyTimeMin: 25 },
    { id: 'p1.4', name: 'Electric Field', type: null, estimatedStudyTimeMin: 25 }
  ]
}
const PLAN = [{ id: 'pi1', subject: 'Physics', chapter_name: 'Electric Charges and Fields', status: 'started', active: true, curriculum_chapter_id: 'p1' }]
const CKB = new Map([['p1', CHAPTER]])
const BP = { weights: { p1: 3 } }

const base = { planItems: PLAN, curriculum: CKB, blueprint: BP, now: NOW }

describe('budget split', () => {
  it('due revisions never eat more than DUE_CAP of the day when new work exists', () => {
    const topics = Array.from({ length: 12 }, () => dueTopic())
    const m = buildMission({ ...base, availableMin: 100, topics })
    expect(m.budget.revisionMin).toBeLessThanOrEqual(100 * DUE_CAP)
    expect(m.items.some((it) => it.kind === 'new')).toBe(true)
  })

  it('recovery is capped at RECOVERY_FRAC — a mountain of missed work returns as a slice', () => {
    const topics = Array.from({ length: 20 }, () => missedTopic(6))
    const m = buildMission({ ...base, availableMin: 100, topics })
    expect(m.budget.recoveryMin).toBeLessThanOrEqual(100 * RECOVERY_FRAC)
    // 48-overdue never appears anywhere in the mission output.
    expect(m.items.filter((it) => it.kind === 'recovery').length).toBe(
      Math.floor((100 * RECOVERY_FRAC) / REVISION_MIN_PER_ITEM)
    )
  })

  it('the remainder goes to new learning from the ACTIVE chapter only', () => {
    const m = buildMission({ ...base, availableMin: 120, topics: [dueTopic()] })
    const newItems = m.items.filter((it) => it.kind === 'new')
    expect(newItems.length).toBeGreaterThan(0)
    for (const it of newItems) expect(it.planItemId).toBe('pi1')
    // Minutes add up to the whole day: last new block absorbs the residual.
    expect(m.items.reduce((a, it) => a + it.plannedMin, 0)).toBe(120)
  })

  it('a tiny day becomes revision-only — even 10 minutes counts', () => {
    const m = buildMission({ ...base, availableMin: 12, topics: [dueTopic(), missedTopic(4)] })
    expect(m.feasible).toBe(true)
    expect(m.items.every((it) => it.kind !== 'new')).toBe(true)
  })

  it('no roadmap/CKB → revisions + recovery only (Mode 1 keeps working)', () => {
    const m = buildMission({ availableMin: 60, topics: [dueTopic(), missedTopic(5)], now: NOW })
    expect(m.feasible).toBe(true)
    expect(m.items.map((it) => it.kind).sort()).toEqual(['recovery', 'revision'])
  })

  it('with no new work available, revision may expand past its cap — the day is never wasted', () => {
    const topics = Array.from({ length: 12 }, () => dueTopic())
    const m = buildMission({ availableMin: 100, topics, now: NOW })
    expect(m.budget.revisionMin).toBeGreaterThan(100 * DUE_CAP)
  })
})

describe('scoring', () => {
  it('an important chapter outranks an unpriced one; weakness multiplies', () => {
    const strong = newTopicScore({ examWeight: 3, type: null })
    const floor = newTopicScore({ examWeight: 0, type: null })
    expect(strong).toBeGreaterThan(floor)
    expect(newTopicScore({ examWeight: 3, type: null, weak: true })).toBeCloseTo(strong * 1.4)
  })

  it('faded memory is more urgent than fresh memory', () => {
    expect(revisionScore({ memory: 20, examWeight: 1 })).toBeGreaterThan(revisionScore({ memory: 80, examWeight: 1 }))
  })

  it('derives chapter ids from every topic-id shape', () => {
    expect(chapterIdOfTopic('p1.5')).toBe('p1')
    expect(chapterIdOfTopic('p11_1.1')).toBe('p11_1')
    expect(chapterIdOfTopic('b12_1_s')).toBe('b12_1')
    expect(chapterIdOfTopic(null)).toBe(null)
  })
})

describe('momentum / recovery', () => {
  it('long-missed near-zero-memory topics rank as re-learning, after fresh rescues', () => {
    const rescue = missedTopic(5, { name: 'Fresh miss' })
    const cold = missedTopic(RELEARN_AFTER_DAYS + 20, { name: 'Cold topic' })
    const q = recoveryQueue([cold, rescue], { now: NOW })
    expect(q[0].label).toBe('Fresh miss')
    expect(q[1].relearning).toBe(true)
  })

  it('flexible windows: Day 7 stretches ±2, Day 30 ±10, never rushes early topics', () => {
    expect(windowDays(7)).toBe(2)
    expect(windowDays(30)).toBe(11)
    expect(withinWindow({ scheduled_date: '2026-07-20', interval_label: '1_week' }, TODAY)).toBe(true)  // 2 late
    expect(withinWindow({ scheduled_date: '2026-07-18', interval_label: '1_week' }, TODAY)).toBe(false) // 4 late
    expect(withinWindow({ scheduled_date: '2026-07-25', interval_label: '1_week' }, TODAY)).toBe(true)  // future
  })

  it('memory health averages only revised topics and labels gently', () => {
    expect(memoryHealth([topic({ dates: [TODAY] })], NOW)).toBe(null) // nothing revised yet
    expect(memoryHealthLabel(92)).toBe('Excellent')
    expect(memoryHealthLabel(70)).toBe('Good')
    expect(memoryHealthLabel(40)).toBe('Needs attention')
  })
})

describe('flexible windows in the split', () => {
  it('a slightly-late revision is ordinary due work, not a recovery case', () => {
    // 1_week interval, 2 days late → inside the ±2 window.
    const slightlyLate = topic({ dates: ['2026-07-13', '2026-07-20'], done: 1 })
    slightlyLate.revisions[1].interval_label = '1_week'
    const m = buildMission({ availableMin: 30, topics: [slightlyLate], now: NOW })
    expect(m.items[0].kind).toBe('revision')
  })
})

describe('adaptive rescheduling', () => {
  const chain = [
    { id: 'r0', scheduled_date: '2026-07-01', completed: true },
    { id: 'r1', scheduled_date: '2026-07-02', completed: true },
    { id: 'r2', scheduled_date: '2026-07-08', completed: false }, // the one just done, late
    { id: 'r3', scheduled_date: '2026-07-31', completed: false },
    { id: 'r4', scheduled_date: '2026-10-29', completed: false }
  ]

  it('preserves spacing from the actual completion date, not the missed one', async () => {
    const { rescheduleAfter } = await import('./schedule')
    // r2 (planned Jul 8) done Jul 22 → r3 keeps its 23-day gap → Aug 14.
    const { updates, dropped } = rescheduleAfter(chain, 'r2', '2026-07-22', null)
    expect(updates).toEqual([
      { id: 'r3', scheduled_date: '2026-08-14' },
      { id: 'r4', scheduled_date: '2026-11-12' }
    ])
    expect(dropped).toEqual([])
  })

  it('drops (never compresses) reviews shifted past the exam', async () => {
    const { rescheduleAfter } = await import('./schedule')
    const { updates, dropped } = rescheduleAfter(chain, 'r2', '2026-07-22', '2026-09-15')
    expect(updates.map((u) => u.id)).toEqual(['r3'])
    expect(dropped).toEqual(['r4'])
  })

  it('on-time completion moves nothing', async () => {
    const { rescheduleAfter } = await import('./schedule')
    expect(rescheduleAfter(chain, 'r2', '2026-07-08', null)).toEqual({ updates: [], dropped: [] })
  })
})

describe('regenerate & customize', () => {
  it('same seed → identical mission; different seed can rotate near-cut choices', () => {
    const m0a = buildMission({ ...base, availableMin: 70, topics: [], seed: 0 })
    const m0b = buildMission({ ...base, availableMin: 70, topics: [], seed: 0 })
    expect(m0a.items.map(itemKey)).toEqual(m0b.items.map(itemKey))
    // 70 min → 40+ for new = 2 of 4 equal-scored topics: rotation must change the pick.
    const m1 = buildMission({ ...base, availableMin: 70, topics: [], seed: 1 })
    expect(m1.items.map(itemKey)).not.toEqual(m0a.items.map(itemKey))
  })

  it('excluded items never come back; pinned items survive regenerate', () => {
    const m0 = buildMission({ ...base, availableMin: 70, topics: [] })
    const firstNew = m0.items.find((it) => it.kind === 'new')
    const dropped = buildMission({ ...base, availableMin: 70, topics: [], excluded: [itemKey(firstNew)] })
    expect(dropped.items.map(itemKey)).not.toContain(itemKey(firstNew))
    const lastNew = m0.items.filter((it) => it.kind === 'new').pop()
    for (const seed of [1, 2, 3]) {
      const m = buildMission({ ...base, availableMin: 70, topics: [], seed, pinned: [itemKey(lastNew)] })
      expect(m.items.map(itemKey)).toContain(itemKey(lastNew))
    }
  })

  it('already-logged curriculum topics never reappear as new items', () => {
    const logged = topic({ name: "Coulomb's Law", curriculumTopicId: 'p1.3', dates: [TODAY] })
    const m = buildMission({ ...base, availableMin: 120, topics: [logged] })
    expect(m.items.filter((it) => it.kind === 'new').map((it) => it.curriculumTopicId)).not.toContain('p1.3')
  })
})
