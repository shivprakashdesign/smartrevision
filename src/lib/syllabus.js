// Hardcoded syllabus tree — the fast-start picker that sits ALONGSIDE photo-scan
// and manual add (it never replaces them). Filtered to the student's board +
// class + chosen subjects at runtime. Reference data behind the weighted plan.
//
// SCOPE:
//   Class 11 — Physics / Chemistry / Maths / Biology / English. Real chapter +
//     topic lists transcribed from the student's Gujarat Board (GSEB) textbooks,
//     which are the NCERT titles — so the same tree serves GSEB and CBSE. Lives
//     in ncert11.js (~400 topics).
//   Class 12 — Physics / Chemistry / Maths / Biology / Computer Studies. Also
//     real book contents, transcribed the same way, in ncert12.js. Computer
//     Studies is a Gujarat-specific elective with no CBSE equivalent — see that
//     file's header before assuming it applies outside GSEB.
//   Boards: CBSE and Gujarat Board (GSEB); the shared science subjects differ
//     only in board-exam marks, so chapters + JEE weightage live once in NCERT
//     and each board overlays its own marks in BOARD_MARKS. Split a subject's
//     tree per board if it ever turns out the two diverge on chapters.
//
// TWO IMPORTANCE LENSES:
//   `jeeQ`       — avg JEE Main questions a chapter draws per session (national,
//                  same for every board). Source: public JEE Main weightage.
//                  Class 12 PCM verified; Class 11 PCM are priors to tune. null
//                  for Biology, English and Computer Studies — none is examined
//                  by JEE, so they fall back to the engine's floor weight (even
//                  split) until a NEET lens / board marks land.
//   `boardMarks` — the board's own exam marks, attached per board via chaptersFor.
//                  CBSE numbers are user-verified (Class 12 PCM) / priors (Class
//                  11 PCM). GSEB's own Class 12 blueprint (PCM + Biology +
//                  Computer Studies) is in; GSEB Class 11 and GSEB English SL
//                  (which isn't chapter-shaped — see BOARD_MARKS.GSEB[12]
//                  comment) are still pending, so the GSEB board lens is
//                  unavailable for those specifically (hasBoardMarks gates per
//                  class, not per subject).
//
// A chapter absent from a board's BOARD_MARKS overlay isn't tested by that board
// (board weight 0). Subtopic `type` drives the per-item difficulty weight in the
// engine (Derivation / Numerical heavy, MCQ light) where the source data has it;
// real book-topic rows carry no type and default to the Concept weight.

import { CLASS_11 } from './ncert11'
import { CLASS_12 } from './ncert12'

export const SUBTOPIC_TYPES = ['Derivation', 'Concept', 'Numerical', 'MCQ']

// ---- NCERT chapter trees (national: chapters + JEE weightage + subtopics) ----
const NCERT = {
  11: CLASS_11,
  12: CLASS_12
}

// ---- Board exam-marks overlay: board → class → { chapterId: marks } ----
// A chapter absent here isn't tested by that board. CBSE Class 12 is
// user-verified; CBSE Class 11 are priors to verify. GSEB (Gujarat) uses
// 100-mark papers — blueprint PENDING, so its board lens is unavailable.
const BOARD_MARKS = {
  CBSE: {
    11: {
      p11_1: 2, p11_2: 5, p11_3: 5, p11_4: 7, p11_5: 5, p11_6: 6, p11_7: 5,
      p11_8: 3, p11_9: 5, p11_10: 5, p11_11: 5, p11_12: 4, p11_13: 6, p11_14: 7,
      // 9 chapters (rationalised NCERT dropped p-Block Gr.13–14 from Class 11).
      c11_1: 7, c11_2: 8, c11_3: 6, c11_4: 9, c11_5: 7, c11_6: 10, c11_7: 5,
      c11_8: 9, c11_9: 9,
      // Biology / English Class 11 board marks not set yet — see header.
      m11_1: 5, m11_2: 5, m11_3: 8, m11_4: 6, m11_5: 3, m11_6: 5, m11_7: 4,
      m11_8: 6, m11_9: 6, m11_10: 6, m11_11: 4, m11_12: 8, m11_13: 6, m11_14: 8
    },
    12: {
      p1: 5, p2: 5, p3: 6, p4: 8, p5: 3, p6: 3, p7: 3, p8: 4, p9: 8, p10: 6, p11: 4, p12: 4, p13: 4, p14: 7,
      // Chemistry ids are the REAL book's own chapter numbers (1 Solutions … 10
      // Biomolecules) — no p-Block chapter exists in the book at all (see
      // ncert12.js header), so there's nothing to exclude here anymore.
      c1: 7, c2: 9, c3: 7, c4: 7, c5: 7, c6: 6, c7: 6, c8: 8, c9: 6, c10: 7,
      m1: 5, m2: 3, m3: 5, m4: 5, m5: 8, m6: 7, m7: 10, m8: 4, m9: 6, m10: 6, m11: 8, m12: 5, m13: 8
    }
  },
  GSEB: {
    // Class 11 blueprint not supplied yet — Class 11 GSEB board lens stays
    // unavailable until it lands (hasBoardMarks gates per class, not per board).
    11: {},
    // Source: GSEB's own 2025-26 blueprint PDF ("std-12 (વિ.પ્ર)ના પરિરૂપ
    // (દ્રષ્ટિહીન)_2.pdf"), user-supplied 2026-07-21. Physics/Chemistry use
    // `total_marks_without_option` per chapter (each sums exactly to 100).
    12: {
      // Physics — sums to 100.
      p1: 8, p2: 8, p3: 9, p4: 7, p5: 3, p6: 7, p7: 8, p8: 2, p9: 9, p10: 7, p11: 7, p12: 9, p13: 9, p14: 7,
      // Chemistry — sums to 100.
      c1: 9, c2: 12, c3: 10, c4: 9, c5: 11, c6: 8, c7: 12, c8: 12, c9: 9, c10: 8,
      // Maths — the blueprint's own total_marks_without_option sums to 109 on
      // a 100-mark paper (internal-choice overlap in the source document, not
      // a transcription error here); stored as published rather than forced
      // to renormalise.
      m1: 6, m2: 6, m3: 7, m4: 8, m5: 12, m6: 8, m7: 14, m8: 7, m9: 8, m10: 11, m11: 8, m12: 5, m13: 9,
      // Biology — uses `prescribed_weightage`, not the marks fields (that one
      // sums cleanly to 100; the marks fields don't, same choice-overlap as
      // Maths above).
      b12_1: 9, b12_2: 9, b12_3: 7, b12_4: 9, b12_5: 9, b12_6: 8, b12_7: 8,
      b12_8: 7, b12_9: 8, b12_10: 8, b12_11: 6, b12_12: 6, b12_13: 6,
      // Computer Studies — theory weightage only (the 50-mark practical isn't
      // modelled anywhere in this app). User-supplied 2026-07-21, subject code
      // 331. Sums to 100 across the chapters below. Chapters 10–12 (Exception
      // handling, File handling, Publishing documents using LaTeX) are absent
      // from this year's blueprint on purpose — not board-examinable this
      // year — so they carry no board weight, same convention as JEE's
      // untested chapters elsewhere; they stay in the picker for study.
      cs12_1: 10, cs12_2: 12, cs12_3: 10, cs12_4: 10, cs12_5: 12,
      cs12_6: 10, cs12_7: 10, cs12_8: 10, cs12_9: 10, cs12_13: 6
      // English (Second Language) isn't in the blueprint as chapter weights —
      // it's section/skill-based (Reading, Grammar, Writing — a different
      // shape entirely from a chapter model). Left unset.
    }
  }
}

const BOARD_META = { CBSE: { name: 'CBSE' }, GSEB: { name: 'Gujarat Board' } }

// ---- Public API (signatures unchanged from the single-board version) ----
export const SYLLABUS_BOARDS = Object.keys(BOARD_MARKS)

export const boardName = (board) => BOARD_META[board]?.name || board

// Classes with hardcoded data (same set for every board today).
export function syllabusClasses() {
  return Object.keys(NCERT).map(Number).sort((a, b) => b - a)
}

export function syllabusSubjects(board, cls) {
  return Object.keys(NCERT[cls] || {})
}

// Chapters for a board+class+subject, each with the board's own boardMarks
// merged on (null when that board doesn't test / hasn't priced the chapter).
export function chaptersFor(board, cls, subject) {
  const chs = NCERT[cls]?.[subject] || []
  const marks = BOARD_MARKS[board]?.[cls] || {}
  return chs.map(c => ({ ...c, boardMarks: marks[c.id] ?? null }))
}

export function hasSyllabus(board, cls, subject) {
  return chaptersFor(board, cls, subject).length > 0
}

// Does this board publish per-chapter marks for this class? (false → the board
// lens is unavailable, e.g. GSEB until its blueprint lands.)
export function hasBoardMarks(board, cls) {
  return Object.keys(BOARD_MARKS[board]?.[cls] || {}).length > 0
}

// The tree chapter behind a plan_item's (subject, chapter_name), or null when
// it came from a scan and isn't in the hardcoded syllabus.
export function chapterByName(board, cls, subject, name) {
  return chaptersFor(board, cls, subject).find(c => c.chapter === name) || null
}

// Importance weight under a lens ('jee' | 'board'). Board marks are already
// merged onto the chapter by chaptersFor.
export function chapterWeight(chapter, lens = 'jee') {
  return lens === 'board' ? (chapter.boardMarks || 0) : (chapter.jeeQ || 0)
}
