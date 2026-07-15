import { describe, it, expect } from 'vitest'
import { dailyReminder, streakNudge } from './notifyCopy'

describe('dailyReminder', () => {
  const topics = [
    { revision_id: 'r1', topic_name: 'Laws of Motion', subject: 'Physics' },
    { revision_id: 'r2', topic_name: 'Cell Division', subject: 'Biology' },
    { revision_id: 'r3', topic_name: 'Integration by Parts', subject: 'Maths' }
  ]

  it('leads with the most-overdue topic as a question and deep-links its revision', () => {
    const n = dailyReminder(topics)
    expect(n.title).toBe('Can you still explain Laws of Motion?')
    expect(n.body).toBe('Physics · takes about 3 minutes · +2 more due today')
    expect(n.url).toBe('/revise/r1')
    expect(n.tag).toBe('daily-reminder')
  })

  it('drops the "+N more" part when only one thing is due', () => {
    const n = dailyReminder([topics[0]])
    expect(n.body).toBe('Physics · takes about 3 minutes')
  })

  it('falls back gracefully with no subject, and is null with nothing due', () => {
    const n = dailyReminder([{ revision_id: 'r9', topic_name: 'Osmosis' }])
    expect(n.body).toBe('Revision · takes about 3 minutes')
    expect(dailyReminder([])).toBeNull()
    expect(dailyReminder(null)).toBeNull()
  })
})

describe('streakNudge', () => {
  it('fires only with a real streak AND something revisable', () => {
    const n = streakNudge(6, 3)
    expect(n.title).toBe('Your 6-day streak needs 3 minutes 🔥')
    expect(n.url).toBe('/home')
    expect(streakNudge(0, 3)).toBeNull()
    expect(streakNudge(6, 0)).toBeNull()
    expect(streakNudge(null, null)).toBeNull()
  })
})
