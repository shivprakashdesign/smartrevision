// Syllabus adapter — the same public API the picker/calendar/engine have always
// used (chaptersFor, chapterWeight, chapterByName, hasBoardMarks, …), now read
// from the generated Curriculum Knowledge Base (src/curriculum/data) instead of
// hardcoded trees. The transcription sources live in scripts/curriculum-src/;
// `npm run build:curriculum` regenerates the JSON.
//
// Everything here is eager and synchronous ON PURPOSE: this module is only
// reachable from the lazily-loaded syllabus screens (SyllabusPicker,
// StudyCalendar, StudyPlanSettings — see App.jsx), so the curriculum JSON lands
// in those route chunks, not the main bundle. Async, per-subject loading for
// always-on surfaces (the mission engine) goes through curriculum/ckb.js.
//
// TWO IMPORTANCE LENSES (unchanged semantics):
//   `jeeQ`       — avg JEE Main questions per chapter (national), from the
//                  jee-main blueprint; null = not JEE-examined (Biology,
//                  English, Computer Studies) → engine floor weight.
//   `boardMarks` — the board's own exam marks, from that board's blueprint
//                  file; null = board hasn't priced the chapter (or has no
//                  blueprint yet — GSEB Class 11, see hasBoardMarks).

import manifest from '../curriculum/data/index.json'

const subjectFiles = import.meta.glob('../curriculum/data/ncert/*/*.json', { eager: true })
const blueprintFiles = import.meta.glob('../curriculum/data/blueprints/*.json', { eager: true })

export const SUBTOPIC_TYPES = ['Derivation', 'Concept', 'Numerical', 'MCQ']

function blueprint(examId) {
  const row = manifest.blueprints.find((b) => b.examId === examId)
  return row ? blueprintFiles[`../curriculum/data/${row.path}`]?.default : null
}

const JEE = blueprint('jee-main')

// Legacy in-memory shape the engine and tests consume: class → subject →
// [{ id, number, chapter, jeeQ, subtopics: [{ id, code, label, type? }] }].
// Subtopics deliberately carry only the fields the old tree had.
const TREES = {}
for (const row of manifest.subjects) {
  const file = subjectFiles[`../curriculum/data/${row.path}`].default
  ;(TREES[row.class] ??= {})[row.subject] = file.chapters.map((ch) => ({
    id: ch.id,
    number: ch.number,
    chapter: ch.name,
    jeeQ: JEE?.weights?.[ch.id] ?? null,
    subtopics: ch.topics.map((t) =>
      t.type
        ? { id: t.id, code: t.code, label: t.name, type: t.type }
        : { id: t.id, code: t.code, label: t.name }
    )
  }))
}

// ---- Public API (signatures unchanged) ----
export const SYLLABUS_BOARDS = manifest.boards.map((b) => b.id)

export const boardName = (board) =>
  manifest.boards.find((b) => b.id === board)?.name || board

// Classes with curriculum data (same set for every board today).
export function syllabusClasses() {
  return [...new Set(manifest.subjects.map((s) => s.class))].sort((a, b) => b - a)
}

// The chapter LIST is board-independent (shared NCERT tree); boards differ
// only in marks, merged on by chaptersFor.
export function syllabusSubjects(board, cls) {
  return Object.keys(TREES[cls] || {})
}

// Chapters for a board+class+subject, each with the board's own boardMarks
// merged on (null when that board doesn't test / hasn't priced the chapter).
export function chaptersFor(board, cls, subject) {
  const chs = TREES[cls]?.[subject] || []
  const marks = blueprint(`${board.toLowerCase()}-board-${cls}`)?.weights || {}
  return chs.map((c) => ({ ...c, boardMarks: marks[c.id] ?? null }))
}

export function hasSyllabus(board, cls, subject) {
  return chaptersFor(board, cls, subject).length > 0
}

// Does this board publish per-chapter marks for this class? (false → the board
// lens is unavailable, e.g. GSEB Class 11 until its blueprint lands.)
export function hasBoardMarks(board, cls) {
  return blueprint(`${board.toLowerCase()}-board-${cls}`) != null
}

// The tree chapter behind a plan_item's (subject, chapter_name), or null when
// it came from a scan and isn't in the curriculum.
export function chapterByName(board, cls, subject, name) {
  return chaptersFor(board, cls, subject).find((c) => c.chapter === name) || null
}

// Importance weight under a lens ('jee' | 'board'). Board marks are already
// merged onto the chapter by chaptersFor.
export function chapterWeight(chapter, lens = 'jee') {
  return lens === 'board' ? (chapter.boardMarks || 0) : (chapter.jeeQ || 0)
}
