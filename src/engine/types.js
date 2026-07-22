// Shared JSDoc typedefs for the domain layer. No runtime code — import types
// in editors/JSDoc via:  /** @typedef {import('../engine/types').Mission} Mission */

/**
 * A row from `revisions` as every engine consumes it.
 * @typedef {Object} Revision
 * @property {string} id
 * @property {string} scheduled_date  ISO day (YYYY-MM-DD)
 * @property {string} interval_label  'same_day'|'1_day'|'1_week'|'1_month'|'4_months'|'<n>_days'|'extra'
 * @property {boolean} completed
 * @property {string|null} completed_at
 * @property {('good'|'okay'|'struggled')|null} recall_quality
 */

/**
 * A student topic with its nested revisions (topicsRepo shape).
 * @typedef {Object} Topic
 * @property {string} id
 * @property {string} subject
 * @property {string} topic_name
 * @property {string|null} plan_item_id
 * @property {string|null} curriculum_topic_id  CKB topic id, e.g. 'p1.5'
 * @property {Revision[]} revisions
 */

/**
 * A plan_items row — the chapter checklist that doubles as the roadmap.
 * @typedef {Object} PlanItem
 * @property {string} id
 * @property {string} subject
 * @property {string} chapter_name
 * @property {number} position         the student's own order, never curriculum order
 * @property {'pending'|'started'|'done'} status
 * @property {boolean} active          the subject's one Active Chapter
 * @property {string|null} curriculum_chapter_id  CKB chapter id, e.g. 'p1'
 */

/**
 * A CKB topic (from src/curriculum/data subject files).
 * @typedef {Object} CurriculumTopic
 * @property {string} id               stable forever, append-only
 * @property {string} code             book numbering, e.g. '1.5'
 * @property {string} name
 * @property {('Derivation'|'Concept'|'Numerical'|'MCQ')|null} type
 * @property {number} estimatedStudyTimeMin
 */

/**
 * A CKB chapter.
 * @typedef {Object} CurriculumChapter
 * @property {string} id
 * @property {number} number
 * @property {string} name
 * @property {number} estimatedStudyTimeMin
 * @property {number} [pyqFrequency]   0–5, when the data has it
 * @property {CurriculumTopic[]} topics
 */

/**
 * An exam blueprint: one exam's pricing of the curriculum.
 * @typedef {Object} Blueprint
 * @property {string} examId           e.g. 'jee-main', 'gseb-board-12'
 * @property {'board'|'entrance'} kind
 * @property {'marks'|'questions'} unit
 * @property {Object<string, number>} weights  chapterId → weight; absent = untested
 */

/**
 * One line of Today's Mission.
 * @typedef {Object} MissionItem
 * @property {'new'|'revision'|'recovery'} kind
 * @property {string} subject
 * @property {string} label
 * @property {string} [topicId]
 * @property {string} [revisionId]
 * @property {string} [planItemId]
 * @property {string} [curriculumTopicId]
 * @property {number} plannedMin
 * @property {number} score
 * @property {number} position
 */

/**
 * buildMission()'s result.
 * @typedef {Object} Mission
 * @property {boolean} feasible
 * @property {string} [reason]
 * @property {number} availableMin
 * @property {{ newMin: number, revisionMin: number, recoveryMin: number }} budget
 * @property {MissionItem[]} items
 * @property {number|null} memoryHealth
 * @property {number} leftoverMin
 * @property {string} engineVersion
 */

export {}
