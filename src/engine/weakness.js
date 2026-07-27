// Learning Intelligence — inferred weakness. "Weak subjects" used to be a
// manual toggle most students never set; here we read it from the recall
// history the app already records, feeding the SAME WEAK_MULT the planner
// already uses (mission.js / studyPlan.js). No new data, no schema change.
//
// Granularity is subject-level because that's what the engine consumes
// (weakSubjects → new Set → weak.has(subject)). Per-topic weakness in
// revision/recovery ordering is already handled implicitly: computeMemory
// folds a "struggled" grade into faster decay, so a struggled topic surfaces
// with lower memory → higher recovery urgency on its own. The gap this fills
// is NEW-learning prioritisation, which has no per-topic history yet.

import { computeMemory } from './metrics'

// Recall grade → weakness contribution (0 = strong, 1 = weak).
const GRADE_WEAKNESS = { struggled: 1, okay: 0.4, good: 0 }

// Tunables — one place, like SUBJECT_SATURATION in scoring.js.
// A struggle counts for this fraction of the blend; the rest is low-memory.
export const STRUGGLE_WEIGHT = 0.7
// Mean topic weakness at or above this marks a subject weak.
export const WEAK_THRESHOLD = 0.45
// A subject needs at least this many revised topics before we trust inference.
export const MIN_REVISED_FOR_INFERENCE = 2
// Recency half-life (in reviews): each older graded review counts half as much
// every this-many steps back, so a recent run of struggles outweighs old wins.
export const RECALL_HALF_LIFE = 3

const sortByCompletion = (revs) =>
  [...revs].sort((a, b) =>
    ((a.completed_at || a.scheduled_date) < (b.completed_at || b.scheduled_date) ? -1 : 1)
  )

// A topic's weakness in 0..1, or null when it has no graded revisions yet.
// Blends a recency-weighted recall score with how faded its memory is now.
export function topicWeakness(revisions, now = new Date()) {
  const graded = sortByCompletion(
    (revisions || []).filter((r) => r.completed && r.recall_quality in GRADE_WEAKNESS)
  )
  if (!graded.length) return null

  // Recency weighting: newest review is step 0 (full weight), each older one
  // decays by the half-life. Newest is last after the sort.
  let wSum = 0
  let acc = 0
  for (let i = 0; i < graded.length; i++) {
    const stepsBack = graded.length - 1 - i
    const w = Math.pow(0.5, stepsBack / RECALL_HALF_LIFE)
    acc += w * GRADE_WEAKNESS[graded[i].recall_quality]
    wSum += w
  }
  const recallWeakness = wSum ? acc / wSum : 0

  // Low current memory is itself a weakness signal (null → treat as neutral 0.5).
  const mem = computeMemory(revisions, now)
  const memWeakness = mem == null ? 0.5 : 1 - mem / 100

  return STRUGGLE_WEIGHT * recallWeakness + (1 - STRUGGLE_WEIGHT) * memWeakness
}

// Subjects inferred weak from the data. Returns the UNION with `selfReported`,
// so a brand-new account (no history) behaves exactly as today, and a manual
// toggle is always honoured — inference only ever ADDS subjects.
export function inferWeakSubjects(topics, { selfReported = [], now = new Date() } = {}) {
  const scores = {} // subject → [weakness…]
  for (const t of topics || []) {
    const w = topicWeakness(t.revisions, now)
    if (w == null) continue
    const key = t.subject || 'General'
    ;(scores[key] || (scores[key] = [])).push(w)
  }

  const out = new Set(selfReported)
  for (const [subject, ws] of Object.entries(scores)) {
    if (ws.length < MIN_REVISED_FOR_INFERENCE) continue
    const mean = ws.reduce((a, b) => a + b, 0) / ws.length
    if (mean >= WEAK_THRESHOLD) out.add(subject)
  }
  return [...out]
}
