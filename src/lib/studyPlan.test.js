import { describe, it, expect } from 'vitest'
import { buildPlan, studyDaysUntilExam, WEAK_MULT } from './studyPlan'

// Frozen clock at local midnight so day maths are whole days. "Today" is Wed 2026-07-15.
const NOW = new Date('2026-07-15T00:00:00')
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

// A chapter builder — subtopics are [id, type] pairs.
const ch = (id, subject, jeeQ, boardMarks, subs) => ({
  id, chapter: id.toUpperCase(), subject, jeeQ, boardMarks,
  subtopics: subs.map(([sid, type]) => ({ id: sid, label: sid.toUpperCase(), type }))
})

// Two Physics chapters: A is JEE-heavy (jeeQ 3) with a Concept + a Numerical,
// B is JEE-light (jeeQ 1) with one Concept.
const twoChapters = () => [
  ch('a', 'Physics', 3, 6, [['a1', 'Concept'], ['a2', 'Numerical']]),
  ch('b', 'Physics', 1, 5, [['b1', 'Concept']])
]

const chapMin = (plan, id) => plan.perChapter.find(c => c.chapterId === id).minutes

describe('studyDaysUntilExam', () => {
  it('counts every day up to (not including) exam day when all days are study days', () => {
    expect(studyDaysUntilExam('2026-07-22', ALL_DAYS, NOW)).toEqual([
      '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21'
    ])
  })

  it('honours rest days', () => {
    // Weekdays only (Mon–Fri). 15th=Wed … 21st=Tue → drop Sat 18th & Sun 19th.
    expect(studyDaysUntilExam('2026-07-22', [1, 2, 3, 4, 5], NOW)).toEqual([
      '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-20', '2026-07-21'
    ])
  })

  it('is null for an unusable exam date', () => {
    expect(studyDaysUntilExam(null, ALL_DAYS, NOW)).toBeNull()
    expect(studyDaysUntilExam('2026-07-14', ALL_DAYS, NOW)).toBeNull()
  })
})

describe('buildPlan — allocation', () => {
  it('splits the studyable pool by importance × type, exactly', () => {
    // dailyStudyMin 100 → buffer 12 → 88/day × 7 days = 616 studyable.
    // Weights (jee): a1 Concept 3×2=6, a2 Numerical 3×3=9, b1 Concept 1×2=2.
    const plan = buildPlan({ chapters: twoChapters(), examDate: '2026-07-22', dailyStudyMin: 100, studyDays: ALL_DAYS, now: NOW })
    expect(plan.feasible).toBe(true)
    expect(plan.totalStudyable).toBe(616)
    const min = Object.fromEntries(plan.weeks.flatMap(w => w.items).map(it => [it.subtopicId, it.minutes]))
    expect(min).toEqual({ a1: 217, a2: 317, b1: 82 })
    // Every minute of the pool is allocated.
    expect(min.a1 + min.a2 + min.b1).toBe(616)
  })

  it('a numerical outweighs a concept in the same chapter; a heavier chapter outweighs a lighter one', () => {
    const plan = buildPlan({ chapters: twoChapters(), examDate: '2026-07-22', dailyStudyMin: 100, studyDays: ALL_DAYS, now: NOW })
    const min = Object.fromEntries(plan.weeks.flatMap(w => w.items).map(it => [it.subtopicId, it.minutes]))
    expect(min.a2).toBeGreaterThan(min.a1)      // Numerical > Concept
    expect(chapMin(plan, 'a')).toBeGreaterThan(chapMin(plan, 'b')) // jeeQ 3 chapter > jeeQ 1 chapter
  })

  it('a weak subject pulls more time than an equally-weighted strong one', () => {
    const chapters = [
      ch('p', 'Physics', 2, 5, [['p1', 'Concept']]),
      ch('c', 'Chemistry', 2, 5, [['c1', 'Concept']])
    ]
    const strong = buildPlan({ chapters, examDate: '2026-07-22', dailyStudyMin: 100, studyDays: ALL_DAYS, now: NOW })
    expect(chapMin(strong, 'p')).toBe(chapMin(strong, 'c')) // identical weight, identical time

    const weak = buildPlan({ chapters, examDate: '2026-07-22', dailyStudyMin: 100, studyDays: ALL_DAYS, weakSubjects: ['Physics'], now: NOW })
    expect(chapMin(weak, 'p')).toBeGreaterThan(chapMin(weak, 'c'))
    expect(weak.perChapter.find(c => c.chapterId === 'p').weak).toBe(true)
    // Roughly the WEAK_MULT ratio (5.6 : 4 = 1.4).
    expect(chapMin(weak, 'p') / chapMin(weak, 'c')).toBeCloseTo(WEAK_MULT, 1)
  })

  it('switching the lens to board re-weights toward board-heavy chapters', () => {
    const chapters = [
      ch('a', 'Physics', 3, 6, [['a1', 'Concept']]),
      ch('b', 'Physics', 1, 5, [['b1', 'Concept']]) // JEE-light but board-rich
    ]
    const jee = buildPlan({ chapters, examDate: '2026-07-22', dailyStudyMin: 100, lens: 'jee', studyDays: ALL_DAYS, now: NOW })
    const board = buildPlan({ chapters, examDate: '2026-07-22', dailyStudyMin: 100, lens: 'board', studyDays: ALL_DAYS, now: NOW })
    // Same total pool, but B claims a bigger share of it under the board lens.
    expect(board.totalStudyable).toBe(jee.totalStudyable)
    expect(chapMin(board, 'b')).toBeGreaterThan(chapMin(jee, 'b'))
  })
})

describe('buildPlan — feasibility & dropping', () => {
  it('drops the lowest-weight subtopics when there is not enough time, rather than starving all', () => {
    // 2 days × (20 − buffer 2) = 36 studyable → floor 15 ⇒ room for 2 blocks, not 3.
    const plan = buildPlan({ chapters: twoChapters(), examDate: '2026-07-17', dailyStudyMin: 20, studyDays: ALL_DAYS, now: NOW })
    expect(plan.feasible).toBe(true)
    expect(plan.dropped.map(d => d.subtopicId)).toEqual(['b1']) // lightest (weight 2) is cut
    const kept = plan.weeks.flatMap(w => w.items).map(it => it.subtopicId)
    expect(kept.sort()).toEqual(['a1', 'a2'])
    expect(chapMin(plan, 'b')).toBe(0)
    expect(plan.perChapter.find(c => c.chapterId === 'b').droppedSubtopics).toBe(1)
    // Kept blocks each clear the floor and still exhaust the pool.
    plan.weeks.flatMap(w => w.items).forEach(it => expect(it.minutes).toBeGreaterThanOrEqual(15))
    expect(plan.weeks.flatMap(w => w.items).reduce((a, it) => a + it.minutes, 0)).toBe(36)
  })

  it('reports feasible:false with a reason instead of an empty calendar', () => {
    expect(buildPlan({ chapters: twoChapters(), examDate: '2026-07-22', dailyStudyMin: 0, now: NOW }))
      .toMatchObject({ feasible: false, reason: 'no-hours' })
    expect(buildPlan({ chapters: [], examDate: '2026-07-22', dailyStudyMin: 100, now: NOW }))
      .toMatchObject({ feasible: false, reason: 'no-topics' })
  })

  it('returns null for an unusable exam date', () => {
    expect(buildPlan({ chapters: twoChapters(), examDate: null, dailyStudyMin: 100, now: NOW })).toBeNull()
    expect(buildPlan({ chapters: twoChapters(), examDate: '2026-07-01', dailyStudyMin: 100, now: NOW })).toBeNull()
  })
})

describe('buildPlan — weekly calendar', () => {
  it('packs blocks day by day and groups them into 7-day weeks from today', () => {
    // 8 equal single-subtopic chapters, 8 study days, ~88 min each ⇒ one per day,
    // spilling day 8 (Wed 22nd) into week 1.
    const chapters = Array.from({ length: 8 }, (_, i) => ch(`x${i}`, 'Physics', 2, 2, [[`x${i}s`, 'Concept']]))
    const plan = buildPlan({ chapters, examDate: '2026-07-23', dailyStudyMin: 100, studyDays: ALL_DAYS, now: NOW })
    expect(plan.studyDays).toBe(8)
    expect(plan.weeks.map(w => w.index)).toEqual([0, 1])
    expect(plan.weeks[0].items).toHaveLength(7)
    expect(plan.weeks[1].items).toHaveLength(1)
    expect(plan.weeks[0]).toMatchObject({ start: '2026-07-15', end: '2026-07-21' })
    expect(plan.weeks[1].items[0].day).toBe('2026-07-22')
  })
})
