// Topic typing for the CKB build.
//
// WHY THIS IS NARROW. The planner weights topics by type
// (engine/scoring.js TYPE_WEIGHT: Derivation/Numerical 3, Concept 2, MCQ 1)
// and the build turns type into estimatedStudyTimeMin — but every topic in
// this curriculum shipped as `type: null`, so that whole dimension was inert:
// all 693 topics scored as Concept.
//
// The obvious fix — "just tag everything" — is not available honestly. Our
// topics are TEXTBOOK SECTION HEADINGS ("Electric Charge", "Introduction"),
// not study artifacts ("Numerical: force between charges"). One NCERT section
// usually contains a derivation AND numericals AND concept text, and the
// heading rarely says which. Measured against the real data:
//
//   Derivation  — named laws/theorems/principles read straight off the
//                 heading, ~95% precision (see the audited list in the PR).
//   Numerical   — NOT inferable. Physics headings never say "numerical"
//                 (0 hits across 238 topics) though the subject is full of
//                 them, and in Maths the keyword attempts matched "Matrix" and
//                 "Types of Matrices", which are concepts. Guessing here would
//                 inject fake signal into the planner, which is worse than the
//                 honest default.
//   MCQ         — never appears in a section heading at all.
//
// So: tag Derivation where the name proves it, leave everything else to the
// Concept default, and extend deliberately via TYPE_OVERRIDES below. Real
// per-topic typing needs authored curriculum data, not a regex.

// The type axis is only meaningful where derivations are a study activity.
// Biology/English/Computer Studies headings carry no such signal, and the
// Class-12 Biology/CS entries are whole-chapter fallbacks anyway.
export const TYPED_SUBJECTS = new Set(['Physics', 'Chemistry', 'Maths'])

// A named law/theorem/principle/postulate/rule is something a student has to
// state, derive and reproduce — reliably heavier than surrounding prose.
// "equation" is deliberately absent: it matched whole "Differential Equation"
// chapters, which are solving methods rather than derivations.
const DERIVATION = /\b(law|laws|theorem|theorems|principle|postulate|postulates|rule|rules|formula|formulae|derivation|identities)\b/i

// Hand corrections, by stable topic id. The classifier is a starting point,
// not an authority — anything mis-typed gets pinned here and stays fixed.
export const TYPE_OVERRIDES = {
  // Dimensional analysis is a calculation method, not a derivation to reproduce.
  'p11_1.5': 'Concept'
}

export function classifyTopic({ id, name, subject }) {
  if (id in TYPE_OVERRIDES) return TYPE_OVERRIDES[id]
  if (!TYPED_SUBJECTS.has(subject)) return null
  return DERIVATION.test(name) ? 'Derivation' : null
}
