// Roadmap helpers — pure functions over plan_items rows (+ optionally the CKB
// chapter and the student's topics). The roadmap is the student's own order
// through the syllabus; curriculum order is never assumed.

// Threshold for suggesting the student move on. A suggestion, never automatic —
// the student decides ("Active Chapter" rule).
export const ADVANCE_AT = 0.85

// The active plan item per subject: { [subject]: item }.
export function activeChapters(items) {
  const map = {}
  for (const it of items) if (it.active) map[it.subject] = it
  return map
}

// The chapter to activate next in a subject: first non-done item by the
// student's own position order (skipping the currently active one).
export function nextChapter(items, subject, afterItemId = null) {
  return (
    items
      .filter((it) => it.subject === subject && it.status !== 'done' && !it.active && it.id !== afterItemId)
      .sort((a, b) => a.position - b.position)[0] || null
  )
}

// How far through the active chapter the student is, when we can honestly
// tell: needs the CKB chapter (total topic count) and the topics logged
// against this plan item. A topic counts once it has ≥1 completed revision —
// "studied and came back to it", not merely logged.
// Returns { done, total, frac } or null when the chapter isn't CKB-linked.
export function chapterProgress(curriculumChapter, chapterTopics) {
  const total = curriculumChapter?.topics?.length
  if (!total) return null
  const done = chapterTopics.filter((t) => (t.revisions || []).some((r) => r.completed)).length
  return { done, total, frac: done / total }
}

// Should we suggest moving forward? (The UI asks; the student decides.)
export function suggestAdvance(progress) {
  return progress != null && progress.frac >= ADVANCE_AT
}
