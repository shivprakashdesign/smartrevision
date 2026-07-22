// The shared importance formula — one place where "what deserves time" is
// decided, used by both the long-horizon calendar (studyPlan.js) and the daily
// mission engine (mission.js).
//
//   newTopicScore   = max(examWeight, 1) × typeWeight × weakMult × pyqBoost
//   revisionScore   = urgency × (1 + examWeight / 10) × weakMult
//
// examWeight comes from the active exam blueprint (0 = untested/unpriced —
// floored to 1 so unknown content still gets time, never starved). urgency is
// how far memory has decayed, so the faintest topic is rescued first.

export const TYPE_WEIGHT = { Derivation: 3, Numerical: 3, Concept: 2, MCQ: 1 }
export const WEAK_MULT = 1.4
// Per-point boost for PYQ frequency (0–5 scale, when curriculum data has it).
export const PYQ_BOOST = 0.15

// Chapter id from a CKB topic id: 'p1.5' → 'p1', 'p11_1.1' → 'p11_1',
// 'b12_1_s' (whole-chapter fallback topic) → 'b12_1'.
export function chapterIdOfTopic(topicId) {
  if (topicId == null) return null
  const s = String(topicId)
  if (s.endsWith('_s')) return s.slice(0, -2)
  const dot = s.indexOf('.')
  return dot === -1 ? s : s.slice(0, dot)
}

// Score for studying a new curriculum topic today.
export function newTopicScore({ examWeight = 0, type = null, weak = false, pyqFrequency = 0 }) {
  return (
    Math.max(examWeight, 1) *
    (TYPE_WEIGHT[type] || TYPE_WEIGHT.Concept) *
    (weak ? WEAK_MULT : 1) *
    (1 + PYQ_BOOST * (pyqFrequency || 0))
  )
}

// Score for doing a due/missed revision today. `memory` is the current
// retention % (null = never revised, treated as fully faded).
export function revisionScore({ memory = null, examWeight = 0, weak = false }) {
  const urgency = (100 - (memory ?? 0)) / 100
  return urgency * (1 + examWeight / 10) * (weak ? WEAK_MULT : 1)
}
