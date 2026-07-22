// Builds the Curriculum Knowledge Base JSON from the transcribed textbook
// trees (scripts/curriculum-src/ncert11.js / ncert12.js) and the board
// blueprints (scripts/curriculum-src/boardMarks.js).
//
//   node scripts/build-curriculum.mjs
//
// Outputs to src/curriculum/data/ (committed — the generated JSON is the
// artifact the app ships; the src/lib trees are the transcription source):
//   ncert/class{11,12}/{subject}.json   chapter + topic trees, exam-agnostic
//   blueprints/{examId}.json            per-exam chapter weights
//   index.json                          manifest (no tree data)
//   id-snapshot.json                    every id ever published — append-only,
//                                       enforced by curriculum tests
//
// ID RULE: chapter/topic ids ('p1', 'c11_3', 'p11_1.1', …) are stable forever —
// student rows will reference them via curriculum_topic_id. Never renumber or
// delete; mark chapters "deprecated": true instead.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { CLASS_11 } from './curriculum-src/ncert11.js'
import { CLASS_12 } from './curriculum-src/ncert12.js'
import { BOARD_MARKS } from './curriculum-src/boardMarks.js'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/curriculum/data')
const SCHEMA_VERSION = 1
const CURRICULUM_VERSION = '2026.1'

// Minutes per topic by difficulty type. Stored explicitly in the JSON (not
// computed at runtime) so individual numbers can be hand-tuned later.
// A "fallback" topic stands in for a whole chapter the book didn't break down.
const TYPE_MINUTES = { Derivation: 40, Numerical: 40, Concept: 25, MCQ: 15 }
const FALLBACK_TOPIC_MINUTES = 60

const SUBJECT_CODES = {
  Physics: 'physics', Chemistry: 'chemistry', Maths: 'maths',
  Biology: 'biology', English: 'english', 'Computer Studies': 'computer-studies'
}
// Computer Studies is a Gujarat state elective (see ncert12.js header);
// everything else is the shared NCERT tree both boards teach.
const boardsFor = (subject) => (subject === 'Computer Studies' ? ['GSEB'] : ['CBSE', 'GSEB'])

const TREES = { 11: CLASS_11, 12: CLASS_12 }

function topicJson(sub, isFallback) {
  return {
    id: sub.id,
    code: sub.code,
    name: sub.label,
    type: sub.type ?? null, // Derivation|Concept|Numerical|MCQ; null → Concept default
    estimatedStudyTimeMin: isFallback ? FALLBACK_TOPIC_MINUTES : TYPE_MINUTES[sub.type] ?? TYPE_MINUTES.Concept
  }
}

function buildSubjectFile(cls, subject, chapters) {
  return {
    schemaVersion: SCHEMA_VERSION,
    curriculumVersion: CURRICULUM_VERSION,
    class: cls,
    subject,
    subjectCode: SUBJECT_CODES[subject],
    boards: boardsFor(subject),
    chapters: chapters.map((ch) => {
      // A single subtopic whose label is the chapter name is the expandChapters
      // fallback for books that give no topic breakdown.
      const isFallback = ch.subtopics.length === 1 && ch.subtopics[0].label === ch.chapter
      const topics = ch.subtopics.map((s) => topicJson(s, isFallback))
      return {
        id: ch.id,
        number: ch.number,
        name: ch.chapter,
        estimatedStudyTimeMin: topics.reduce((sum, t) => sum + t.estimatedStudyTimeMin, 0),
        topics
      }
    })
  }
}

function write(rel, obj) {
  const file = path.join(OUT, rel)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(obj, null, 2) + '\n')
  console.log('wrote', rel)
}

// ---- subject trees ----------------------------------------------------------
const manifestSubjects = []
for (const [cls, tree] of Object.entries(TREES)) {
  for (const [subject, chapters] of Object.entries(tree)) {
    const file = buildSubjectFile(Number(cls), subject, chapters)
    const rel = `ncert/class${cls}/${file.subjectCode}.json`
    write(rel, file)
    manifestSubjects.push({
      class: Number(cls),
      subject,
      subjectCode: file.subjectCode,
      boards: file.boards,
      path: rel,
      chapterCount: file.chapters.length,
      topicCount: file.chapters.reduce((n, c) => n + c.topics.length, 0)
    })
  }
}

// ---- blueprints -------------------------------------------------------------
// Board blueprints: the board's own per-chapter exam marks. A chapter absent
// from `weights` isn't tested by that exam (weight 0) — the planner floors
// untested/unpriced chapters to weight 1 so they still get study time.
const BOARD_NAMES = { CBSE: 'CBSE', GSEB: 'Gujarat Board' }
const manifestBlueprints = []
for (const [board, byClass] of Object.entries(BOARD_MARKS)) {
  for (const [cls, weights] of Object.entries(byClass)) {
    if (!Object.keys(weights).length) continue // e.g. GSEB Class 11: blueprint pending
    const examId = `${board.toLowerCase()}-board-${cls}`
    write(`blueprints/${examId}.json`, {
      schemaVersion: SCHEMA_VERSION,
      examId,
      name: `${BOARD_NAMES[board]} (Class ${cls})`,
      kind: 'board',
      board,
      class: Number(cls),
      unit: 'marks',
      weights
    })
    manifestBlueprints.push({ examId, kind: 'board', board, class: Number(cls), path: `blueprints/${examId}.json` })
  }
}

// JEE Main: avg questions per chapter per session, national — collected from
// the trees' jeeQ field across both classes (null = chapter not JEE-examined).
const jeeWeights = {}
for (const tree of Object.values(TREES)) {
  for (const chapters of Object.values(tree)) {
    for (const ch of chapters) if (ch.jeeQ != null) jeeWeights[ch.id] = ch.jeeQ
  }
}
write('blueprints/jee-main.json', {
  schemaVersion: SCHEMA_VERSION,
  examId: 'jee-main',
  name: 'JEE Main',
  kind: 'entrance',
  unit: 'questions',
  weights: jeeWeights
})
manifestBlueprints.push({ examId: 'jee-main', kind: 'entrance', path: 'blueprints/jee-main.json' })

// ---- manifest ---------------------------------------------------------------
write('index.json', {
  schemaVersion: SCHEMA_VERSION,
  curriculumVersion: CURRICULUM_VERSION,
  boards: Object.entries(BOARD_NAMES).map(([id, name]) => ({ id, name })),
  subjects: manifestSubjects,
  blueprints: manifestBlueprints
})

// ---- id snapshot (append-only guard) ----------------------------------------
// Union of every id ever published: ids may be added, never removed. The
// curriculum test fails if a previously published id disappears.
const current = new Set()
for (const tree of Object.values(TREES)) {
  for (const chapters of Object.values(tree)) {
    for (const ch of chapters) {
      current.add(ch.id)
      for (const s of ch.subtopics) current.add(s.id)
    }
  }
}
const snapFile = path.join(OUT, 'id-snapshot.json')
const previous = existsSync(snapFile) ? JSON.parse(readFileSync(snapFile, 'utf8')) : []
const gone = previous.filter((id) => !current.has(id))
if (gone.length) {
  console.error(`REFUSING: ${gone.length} previously published id(s) missing (append-only rule):`, gone.slice(0, 10))
  process.exit(1)
}
write('id-snapshot.json', [...new Set([...previous, ...current])].sort())
