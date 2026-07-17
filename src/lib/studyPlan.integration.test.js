import { describe, it, expect } from 'vitest'
import { chaptersFor, chapterByName } from './syllabus'
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
      { id: 1, subject: 'Physics', chapter_name: 'Current Electricity' },        // jeeQ 3
      { id: 2, subject: 'Physics', chapter_name: 'Magnetism & Matter' }          // jeeQ 1
    ]
    const chapters = chaptersFromPlanItems(planItems, 12)
    // The mapping recovered real subtopics from the tree.
    expect(chapters[0].subtopics.length).toBeGreaterThan(0)

    const plan = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 180, studyDays: [1, 2, 3, 4, 5, 6, 7], lens: 'jee', now: NOW })
    expect(plan.feasible).toBe(true)
    expect(plan.weeks.length).toBeGreaterThan(0)
    // Higher JEE weightage → more total time.
    const min = Object.fromEntries(plan.perChapter.map(c => [c.chapter, c.minutes]))
    expect(min['Current Electricity']).toBeGreaterThan(min['Magnetism & Matter'])
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
    const planItems = [
      { id: 1, subject: 'Physics', chapter_name: 'Current Electricity' },  // jeeQ 3 / board 6
      { id: 2, subject: 'Physics', chapter_name: 'Semiconductor Electronics' } // jeeQ 1 / board 7
    ]
    const chapters = chaptersFromPlanItems(planItems, 12)
    const jee = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 180, studyDays: [1, 2, 3, 4, 5, 6, 7], lens: 'jee', now: NOW })
    const board = buildPlan({ chapters, examDate: '2026-09-15', dailyStudyMin: 180, studyDays: [1, 2, 3, 4, 5, 6, 7], lens: 'board', now: NOW })
    const semi = p => p.perChapter.find(c => c.chapter === 'Semiconductor Electronics').minutes
    expect(semi(board)).toBeGreaterThan(semi(jee)) // board-rich chapter gains under the board lens
  })
})
