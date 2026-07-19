import { describe, it, expect } from 'vitest'
import { chaptersFor, chapterByName, syllabusSubjects, hasBoardMarks } from './syllabus'
import { buildPlan } from './studyPlan'

// End-to-end data path the StudyCalendar screen relies on: real plan_items →
// real syllabus weights/subtopics → the engine. Uses the actual Class 12 CBSE
// data, so it also guards against the syllabus and engine drifting apart.
const NOW = new Date('2026-07-15T00:00:00')

// Simulate the screen's plan_item → engine-chapter mapping (incl. the scan fallback).
function chaptersFromPlanItems(planItems, cls) {
  return planItems.map(pi => {
    const tree = chapterByName('CBSE', cls, pi.subject, pi.chapter_name)
    if (tree) return { ...tree, subject: pi.subject }
    return { id: `pi-${pi.id}`, chapter: pi.chapter_name, subject: pi.subject, jeeQ: null, boardMarks: null, subtopics: [{ id: `pi-${pi.id}-s`, label: pi.chapter_name, type: 'Concept' }] }
  })
}

describe('StudyCalendar data path (real syllabus + engine)', () => {
  it('builds a feasible weighted plan from real Class 12 Physics chapters', () => {
    // Two real chapters the picker would write as plan_items.
    const planItems = [
      { id: 1, subject: 'Physics', chapter_name: 'Current Electricity' },  // jeeQ 3
      { id: 2, subject: 'Physics', chapter_name: 'Magnetism and Matter' }  // jeeQ 1
    ]
    const chapters = chaptersFromPlanItems(planItems, 12)
    // The mapping recovered real subtopics from the tree (not the scan fallback).
    expect(chapters[1].subtopics.length).toBeGreaterThan(1)

    const plan = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 180, studyDays: [1, 2, 3, 4, 5, 6, 7], lens: 'jee', now: NOW })
    expect(plan.feasible).toBe(true)
    expect(plan.weeks.length).toBeGreaterThan(0)
    // Higher JEE weightage → more total time.
    const min = Object.fromEntries(plan.perChapter.map(c => [c.chapter, c.minutes]))
    expect(min['Current Electricity']).toBeGreaterThan(min['Magnetism and Matter'])
  })

  it('a scanned chapter not in the tree still gets planned via the fallback block', () => {
    const planItems = [{ id: 9, subject: 'Physics', chapter_name: 'Some scanned chapter' }]
    const chapters = chaptersFromPlanItems(planItems, 12)
    expect(chapters[0].subtopics).toHaveLength(1) // one generic block
    const plan = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 180, studyDays: [1, 2, 3, 4, 5, 6, 7], now: NOW })
    expect(plan.feasible).toBe(true)
    expect(plan.perChapter[0].minutes).toBeGreaterThan(0)
  })

  it('the board lens re-weights toward board-heavy chapters (Semiconductors)', () => {
    const semiName = 'Semiconductor Electronics: Materials, Devices and Simple Circuits'
    const planItems = [
      { id: 1, subject: 'Physics', chapter_name: 'Current Electricity' },  // jeeQ 3 / board 6
      { id: 2, subject: 'Physics', chapter_name: semiName }                // jeeQ 1 / board 7
    ]
    const chapters = chaptersFromPlanItems(planItems, 12)
    const jee = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 180, studyDays: [1, 2, 3, 4, 5, 6, 7], lens: 'jee', now: NOW })
    const board = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 180, studyDays: [1, 2, 3, 4, 5, 6, 7], lens: 'board', now: NOW })
    const semi = p => p.perChapter.find(c => c.chapter === semiName).minutes
    expect(semi(board)).toBeGreaterThan(semi(jee)) // board-rich chapter gains under the board lens
  })
})

describe('Class 12 real textbook data', () => {
  it('has 10 Chemistry chapters (no standalone p-Block chapter in the book)', () => {
    const chem = chaptersFor('CBSE', 12, 'Chemistry')
    expect(chem).toHaveLength(10)
    expect(chem.some(c => /p-Block/i.test(c.chapter))).toBe(false)
    expect(chem.reduce((a, c) => a + (c.boardMarks || 0), 0)).toBe(70) // marks still sum correctly after remap
  })

  it('Biology and Computer Studies chapters plan as one block each (book gives no topic breakdown)', () => {
    const bio = chaptersFor('CBSE', 12, 'Biology')
    const cs = chaptersFor('CBSE', 12, 'Computer Studies')
    expect(bio).toHaveLength(13)
    expect(cs).toHaveLength(13)
    expect(bio[0].subtopics).toEqual([{ id: 'b12_1_s', code: '1', label: 'Sexual Reproduction in Flowering Plants' }])
    expect(cs[0].jeeQ).toBeNull()

    const chapters = chaptersFromPlanItems([
      { id: 1, subject: 'Computer Studies', chapter_name: 'Java Basics' }
    ], 12)
    const plan = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 120, studyDays: [1, 2, 3, 4, 5, 6, 7], now: NOW })
    expect(plan.feasible).toBe(true)
    expect(plan.perChapter[0].minutes).toBeGreaterThan(0)
  })
})

describe('multi-class / multi-board coverage', () => {
  it('builds a Class 11 plan from the real textbook chapter/topic tree', () => {
    // Class 11 now carries the real book contents for all five subjects.
    expect(syllabusSubjects('CBSE', 11)).toEqual(['Physics', 'Chemistry', 'Maths', 'Biology', 'English'])
    const chapters = chaptersFromPlanItems([
      { id: 1, subject: 'Physics', chapter_name: 'Laws of Motion' },                          // jeeQ 2
      { id: 2, subject: 'Physics', chapter_name: 'System of Particles and Rotational Motion' } // jeeQ 2
    ], 11)
    // Real NCERT topic lists, not hand-authored stand-ins.
    expect(chapters[0].subtopics).toHaveLength(11)                        // Laws of Motion 4.1–4.11
    expect(chapters[0].subtopics[3].label).toBe("Newton's First Law of Motion")
    expect(chapters[0].boardMarks).toBeGreaterThan(0) // CBSE 11 marks merged on
    const plan = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 120, studyDays: [1, 2, 3, 4, 5, 6, 7], now: NOW })
    expect(plan.feasible).toBe(true)
  })

  it('Biology and English carry no JEE weight, so they plan as an even split', () => {
    const bio = chaptersFor('CBSE', 11, 'Biology')
    expect(bio).toHaveLength(19)
    expect(bio[0].jeeQ).toBeNull()               // JEE doesn't examine Biology
    expect(chaptersFor('CBSE', 11, 'English')[0].chapter).toBe('The Portrait of a Lady')

    // Two equal-sized Biology chapters get equal time (floor weight, no lens signal).
    const chapters = chaptersFromPlanItems([
      { id: 1, subject: 'Biology', chapter_name: 'The Living World' },   // 2 topics
      { id: 2, subject: 'Biology', chapter_name: 'Animal Kingdom' }      // 2 topics
    ], 11)
    const plan = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 120, studyDays: [1, 2, 3, 4, 5, 6, 7], now: NOW })
    expect(plan.feasible).toBe(true)
    const [a, b] = plan.perChapter.map(c => c.minutes)
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1) // even, modulo rounding residual
  })

  it('GSEB shares NCERT chapters + JEE weights, but board marks are pending', () => {
    // Same chapters as CBSE (NCERT), JEE weightage carries over…
    const cbse = chaptersFor('CBSE', 12, 'Physics').map(c => c.chapter)
    const gseb = chaptersFor('GSEB', 12, 'Physics').map(c => c.chapter)
    expect(gseb).toEqual(cbse)
    // …but no board marks yet, so the board lens is unavailable for GSEB.
    expect(hasBoardMarks('CBSE', 12)).toBe(true)
    expect(hasBoardMarks('GSEB', 12)).toBe(false)
    expect(chaptersFor('GSEB', 12, 'Physics')[0].boardMarks).toBeNull()

    // The JEE lens still produces a full plan for a GSEB student.
    const chapters = chaptersFromPlanItems([
      { id: 1, subject: 'Physics', chapter_name: 'Current Electricity' }
    ], 12).map(c => ({ ...c, ...chapterByName('GSEB', 12, 'Physics', 'Current Electricity') }))
    const plan = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 120, studyDays: [1, 2, 3, 4, 5, 6, 7], lens: 'jee', now: NOW })
    expect(plan.feasible).toBe(true)
  })
})
