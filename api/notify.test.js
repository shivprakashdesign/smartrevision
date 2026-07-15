import { describe, it, expect } from 'vitest'
import { inWindow, localClock } from './notify.js'

describe('inWindow', () => {
  it('fires exactly once per day: inside [target, target+15) only', () => {
    expect(inWindow('18:00', '18:00')).toBe(true)
    expect(inWindow('18:14', '18:00')).toBe(true)
    expect(inWindow('18:15', '18:00')).toBe(false)
    expect(inWindow('17:59', '18:00')).toBe(false)
  })

  it('handles reminder times whose window crosses midnight', () => {
    // A 23:50 reminder is picked up by the 00:00 run of the next day.
    expect(inWindow('23:50', '23:50')).toBe(true)
    expect(inWindow('00:00', '23:50')).toBe(true)
    expect(inWindow('00:04', '23:50')).toBe(true)
    expect(inWindow('00:05', '23:50')).toBe(false)
  })

  it('accepts postgres time strings with seconds', () => {
    expect(inWindow('18:05', '18:00:00')).toBe(true)
  })
})

describe('localClock', () => {
  it('returns the wall clock of the given timezone for the same instant', () => {
    const instant = new Date('2026-07-15T18:30:00Z')
    expect(localClock('Asia/Kolkata', instant)).toEqual({ date: '2026-07-16', time: '00:00' })
    expect(localClock('UTC', instant)).toEqual({ date: '2026-07-15', time: '18:30' })
  })
})
