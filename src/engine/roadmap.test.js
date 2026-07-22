import { describe, it, expect } from 'vitest'
import { activeChapters, nextChapter, chapterProgress, suggestAdvance, ADVANCE_AT } from './roadmap'

const items = [
  { id: 'a', subject: 'Physics', position: 0, status: 'done', active: false },
  { id: 'b', subject: 'Physics', position: 1, status: 'started', active: true },
  { id: 'c', subject: 'Physics', position: 2, status: 'pending', active: false },
  { id: 'd', subject: 'Maths', position: 0, status: 'pending', active: false }
]

describe('roadmap', () => {
  it('activeChapters maps subject → its one active item', () => {
    expect(activeChapters(items)).toEqual({ Physics: items[1] })
  })

  it('nextChapter follows the STUDENT\'s position order, skipping done and active', () => {
    expect(nextChapter(items, 'Physics').id).toBe('c')
    expect(nextChapter(items, 'Maths').id).toBe('d')
    expect(nextChapter(items, 'Chemistry')).toBe(null)
  })

  it('nextChapter can exclude the chapter just finished', () => {
    expect(nextChapter(items, 'Physics', 'c')).toBe(null)
  })

  it('progress counts only topics with a completed revision, over the CKB total', () => {
    const chapter = { topics: [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }] }
    const logged = [
      { id: 'x', revisions: [{ completed: true }] },
      { id: 'y', revisions: [{ completed: false }] } // logged but never revised — not "done"
    ]
    expect(chapterProgress(chapter, logged)).toEqual({ done: 1, total: 4, frac: 0.25 })
  })

  it('no CKB link → no progress claim, no advance nag', () => {
    expect(chapterProgress(null, [])).toBe(null)
    expect(suggestAdvance(null)).toBe(false)
  })

  it(`suggests advancing at ${ADVANCE_AT * 100}%, never below`, () => {
    expect(suggestAdvance({ done: 3, total: 4, frac: 0.75 })).toBe(false)
    expect(suggestAdvance({ done: 17, total: 20, frac: 0.85 })).toBe(true)
  })
})
