// Today's Mission — the daily planner. Give it the minutes a student has today
// and everything the app already knows (their topics+revisions, their roadmap,
// the CKB chapters for their active chapters, the exam blueprint) and it
// returns one balanced list: due revisions first, a capped slice of recovery,
// then new learning from each subject's active chapter, weighted by importance.
// Pure function — no fetching, no dates read from the environment.
//
// Budget rules (never an equal split):
//   revisions  ≤ DUE_CAP of the day; overflow rides its flexible window
//   recovery   ≤ RECOVERY_FRAC of the day — missed work returns gradually,
//               and its queue size is never shown (Memory Health is)
//   new        the remainder, ≥ MIN_SUBTOPIC_MIN per block, drop-lowest when
//               short — the same floor-and-drop behavior as the calendar
// With no roadmap/CKB the mission degrades to revisions + recovery only, so
// custom/scanned content (and Mode 1 students) lose nothing.

import { topicBucket, nextRevision, computeMemory } from './metrics'
import { newTopicScore, revisionScore, chapterIdOfTopic } from './scoring'
import { recoveryQueue, memoryHealth, withinWindow } from './recovery'

export const REVISION_MIN_PER_ITEM = 10 // a recall pass + settling, not a study block
export const DUE_CAP = 0.4              // revisions may claim at most this much of the day
export const RECOVERY_FRAC = 0.2        // recovery budget: gentle, never a flood
export const MIN_NEW_BLOCK_MIN = 15     // same floor as the calendar's MIN_SUBTOPIC_MIN
export const REGEN_BAND = 0.15          // regenerate swaps among scores within 15% of the cut

export const ENGINE_VERSION = 'mission-1'

// Mode 2 (Intelligent Study Coach) is for Classes 11–12; everyone else keeps
// the guided flow untouched. `coach_mode: false` is an explicit opt-out.
export function coachModeEnabled(student) {
  if (!student || student.coach_mode === false) return false
  return ['11', '12'].includes(String(student.class_grade))
}

// Stable identity for pin/exclude across regenerates.
export const itemKey = (it) =>
  it.kind === 'new' ? `new:${it.curriculumTopicId ?? it.label}` : `rev:${it.revisionId}`

// Deterministic regenerate: candidates whose score sits within REGEN_BAND of
// the selection cut form a rotation pool; `seed` rotates which of them make
// the cut. Pure — same seed, same mission.
function rotatePool(selected, rest, seed, pinnedSet) {
  if (!rest.length || !selected.length || seed === 0) return { selected, rest }
  const cut = selected[selected.length - 1].score
  // Pinned items are locked in — they never enter the rotation pool.
  const inBand = (it) => !pinnedSet.has(itemKey(it)) && it.score >= cut * (1 - REGEN_BAND) && it.score <= cut * (1 + REGEN_BAND)
  const poolSel = selected.filter(inBand)
  const poolRest = rest.filter(inBand)
  const pool = [...poolSel, ...poolRest]
  if (pool.length < 2) return { selected, rest }
  const k = seed % pool.length
  const rotated = [...pool.slice(k), ...pool.slice(0, k)].slice(0, poolSel.length)
  const chosen = new Set(rotated.map(itemKey))
  return {
    selected: [...selected.filter((it) => !inBand(it)), ...pool.filter((it) => chosen.has(itemKey(it)))],
    rest: pool.filter((it) => !chosen.has(itemKey(it)))
  }
}

export function buildMission({
  availableMin,
  topics = [],
  planItems = [],            // the roadmap: active flags + curriculum_chapter_id
  curriculum = new Map(),    // curriculumChapterId → CKB chapter (loaded subjects only)
  blueprint = null,          // active exam lens, or null
  weakSubjects = [],
  seed = 0,
  pinned = [],               // item keys the student locked in
  excluded = [],             // item keys the student removed
  now = new Date()
} = {}) {
  const avail = Math.round(Number(availableMin) || 0)
  if (avail <= 0) return { feasible: false, reason: 'no-time', availableMin: avail, items: [], budget: { newMin: 0, revisionMin: 0, recoveryMin: 0 }, memoryHealth: memoryHealth(topics, now), leftoverMin: 0 }

  const todayISO = now.toISOString().slice(0, 10)
  const weak = new Set(weakSubjects)
  const excludedSet = new Set(excluded)
  const pinnedSet = new Set(pinned)

  const itemByPlan = new Map(planItems.map((pi) => [pi.id, pi]))
  const weightOf = (chapterId) => blueprint?.weights?.[chapterId] ?? 0
  // A topic's exam weight comes through its plan link (or its own CKB link).
  const examWeightOf = (t) => {
    const viaPlan = itemByPlan.get(t.plan_item_id)?.curriculum_chapter_id
    const chapterId = viaPlan ?? chapterIdOfTopic(t.curriculum_topic_id)
    return chapterId ? weightOf(chapterId) : 0
  }

  // ---- due revisions --------------------------------------------------------
  // "Due" honors the flexible window: a Day-7 review is honestly on time
  // anywhere in days 6–10, so a slightly-late revision is ordinary work, not
  // a recovery case. Only revisions outside their window enter the queue.
  const bucketOf = (t) => {
    const b = topicBucket(t.revisions || [], todayISO)
    if (b !== 'missed') return b
    return withinWindow(nextRevision(t.revisions || []), todayISO) ? 'due' : 'missed'
  }
  const due = topics
    .filter((t) => bucketOf(t) === 'due')
    .map((t) => {
      const next = nextRevision(t.revisions || [])
      const memory = computeMemory(t.revisions || [], now)
      return {
        kind: 'revision',
        subject: t.subject,
        label: t.topic_name,
        topicId: t.id,
        revisionId: next.id,
        plannedMin: REVISION_MIN_PER_ITEM,
        score: revisionScore({ memory, examWeight: examWeightOf(t), weak: weak.has(t.subject) })
      }
    })
    .filter((it) => !excludedSet.has(itemKey(it)))
    .sort((a, b) => b.score - a.score)

  // ---- recovery (missed, gently) --------------------------------------------
  const outsideWindow = topics.filter((t) => bucketOf(t) === 'missed')
  const queue = recoveryQueue(outsideWindow, { examWeightOf, weakSubjects, now }).map((q) => ({
    kind: 'recovery',
    subject: q.subject,
    label: q.label,
    topicId: q.topicId,
    revisionId: q.revisionId,
    plannedMin: REVISION_MIN_PER_ITEM,
    score: q.score
  })).filter((it) => !excludedSet.has(itemKey(it)))

  // ---- new learning candidates (active chapters only) -----------------------
  const loggedIds = new Set(topics.map((t) => t.curriculum_topic_id).filter(Boolean))
  const loggedNames = new Set(topics.map((t) => `${t.subject}::${t.topic_name}`))
  const newCandidates = []
  for (const pi of planItems) {
    if (!pi.active || pi.status === 'done') continue
    const chapter = pi.curriculum_chapter_id ? curriculum.get(pi.curriculum_chapter_id) : null
    if (!chapter) continue // scanned/custom chapter — quick-pick still covers it
    const examWeight = weightOf(pi.curriculum_chapter_id)
    for (const topic of chapter.topics || []) {
      if (loggedIds.has(topic.id) || loggedNames.has(`${pi.subject}::${topic.name}`)) continue
      const it = {
        kind: 'new',
        subject: pi.subject,
        label: topic.name,
        chapterName: pi.chapter_name,
        planItemId: pi.id,
        curriculumTopicId: topic.id,
        plannedMin: Math.max(topic.estimatedStudyTimeMin || MIN_NEW_BLOCK_MIN, MIN_NEW_BLOCK_MIN),
        score: newTopicScore({
          examWeight,
          type: topic.type,
          weak: weak.has(pi.subject),
          pyqFrequency: chapter.pyqFrequency || 0
        })
      }
      if (!excludedSet.has(itemKey(it))) newCandidates.push(it)
    }
  }

  // ---- budget split ---------------------------------------------------------
  const pinFirst = (arr) => [...arr.filter((it) => pinnedSet.has(itemKey(it))), ...arr.filter((it) => !pinnedSet.has(itemKey(it)))]

  const dueCapMin = Math.floor(avail * DUE_CAP)
  const dueTake = pinFirst(due).slice(0, Math.max(1, Math.floor(dueCapMin / REVISION_MIN_PER_ITEM)))
  const revisionMin = Math.min(dueTake.length * REVISION_MIN_PER_ITEM, avail)

  const recoveryCapMin = Math.floor(avail * RECOVERY_FRAC)
  const recoveryTake = pinFirst(queue).slice(0, Math.floor(Math.min(recoveryCapMin, avail - revisionMin) / REVISION_MIN_PER_ITEM))
  const recoveryMin = recoveryTake.length * REVISION_MIN_PER_ITEM

  let newMin = avail - revisionMin - recoveryMin
  let newTake = []
  if (newMin >= MIN_NEW_BLOCK_MIN && newCandidates.length) {
    const ordered = pinFirst([...newCandidates].sort((a, b) => b.score - a.score))
    let used = 0
    const rest = []
    for (const it of ordered) {
      if (used + it.plannedMin <= newMin) {
        newTake.push(it)
        used += it.plannedMin
      } else {
        rest.push(it)
      }
    }
    ;({ selected: newTake } = rotatePool(newTake, rest, seed, pinnedSet))
    // The last block absorbs whatever's left so the mission adds up to the day.
    const spent = newTake.reduce((a, it) => a + it.plannedMin, 0)
    if (newTake.length && spent < newMin) {
      newTake[newTake.length - 1] = {
        ...newTake[newTake.length - 1],
        plannedMin: newTake[newTake.length - 1].plannedMin + (newMin - spent)
      }
    }
  } else {
    newMin = 0
  }

  // No new learning possible (tiny day, no roadmap, chapter finished): the day
  // belongs to revision — let due + recovery expand past their caps.
  let extraRevision = []
  if (!newTake.length) {
    let left = avail - revisionMin - recoveryMin
    const overflow = [...due.filter((it) => !dueTake.includes(it)), ...queue.filter((it) => !recoveryTake.includes(it))]
    for (const it of overflow) {
      if (left < REVISION_MIN_PER_ITEM) break
      extraRevision.push(it)
      left -= REVISION_MIN_PER_ITEM
    }
  }

  const items = [...dueTake, ...recoveryTake, ...extraRevision, ...newTake].map((it, i) => ({ ...it, position: i }))
  const usedMin = items.reduce((a, it) => a + it.plannedMin, 0)

  return {
    feasible: items.length > 0,
    reason: items.length ? undefined : 'nothing-to-do',
    availableMin: avail,
    budget: {
      revisionMin: revisionMin + extraRevision.filter((it) => it.kind === 'revision').length * REVISION_MIN_PER_ITEM,
      recoveryMin: recoveryMin + extraRevision.filter((it) => it.kind === 'recovery').length * REVISION_MIN_PER_ITEM,
      newMin: newTake.reduce((a, it) => a + it.plannedMin, 0)
    },
    items,
    memoryHealth: memoryHealth(topics, now),
    leftoverMin: Math.max(0, avail - usedMin),
    engineVersion: ENGINE_VERSION
  }
}
