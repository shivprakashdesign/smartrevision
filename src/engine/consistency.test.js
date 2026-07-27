import { describe, it, expect } from 'vitest'
import { consistencyScore, consistencyLabel, CONSISTENCY_GOOD } from './consistency'

const NOW = new Date('2026-07-27T12:00:00')
const day = (n) => new Date(NOW.getTime() - n * 86400000).toISOString().slice(0, 10)

describe('consistencyScore', () => {
  it('is null until something in the window has been logged', () => {
    expect(consistencyScore([], { now: NOW })).toBe(null)
    expect(consistencyScore([{ mission_date: day(0), available_min: 120, actual_min: null }], { now: NOW })).toBe(null)
  })

  it('is the mean share of planned time kept', () => {
    const score = consistencyScore([
      { mission_date: day(0), available_min: 120, actual_min: 120 }, // 1.0
      { mission_date: day(1), available_min: 120, actual_min: 60 }   // 0.5
    ], { now: NOW })
    expect(score).toBe(75)
  })

  it('caps a single day at 100% — one marathon cannot mask skipped days', () => {
    const score = consistencyScore([
      { mission_date: day(0), available_min: 60, actual_min: 600 }, // capped to 1.0, not 10
      { mission_date: day(1), available_min: 60, actual_min: 0 }
    ], { now: NOW })
    expect(score).toBe(50)
  })

  it('ignores un-logged and unplanned days rather than scoring them zero', () => {
    const withGaps = consistencyScore([
      { mission_date: day(0), available_min: 100, actual_min: 100 },
      { mission_date: day(1), available_min: 100, actual_min: null }, // unknown
      { mission_date: day(2), available_min: 0, actual_min: 0 }       // no plan = rest day
    ], { now: NOW })
    expect(withGaps).toBe(100)
  })

  it('only counts the trailing window', () => {
    const score = consistencyScore([
      { mission_date: day(0), available_min: 100, actual_min: 100 },
      { mission_date: day(30), available_min: 100, actual_min: 0 } // long past, excluded
    ], { now: NOW })
    expect(score).toBe(100)
  })
})

describe('consistencyLabel', () => {
  it('reads as information, never as a scolding', () => {
    expect(consistencyLabel(null)).toBe(null)
    expect(consistencyLabel(CONSISTENCY_GOOD)).toBe('Right on your plan')
    expect(consistencyLabel(60)).toBe('Close to your plan')
    expect(consistencyLabel(20)).toBe('Plans are running long')
  })
})
