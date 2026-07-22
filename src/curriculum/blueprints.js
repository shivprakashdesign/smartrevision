// Exam blueprint loader. A blueprint prices the (exam-agnostic) curriculum for
// one exam: per-chapter marks for a board paper, avg questions for JEE. A
// chapter absent from `weights` isn't tested by that exam — the planner floors
// untested chapters to weight 1 so they still get study time.

import manifest from './data/index.json'

const blueprintModules = import.meta.glob('./data/blueprints/*.json')

const cache = new Map()

export function blueprintList() {
  return manifest.blueprints
}

// The board blueprint for a class, if that board has published one (GSEB
// Class 11 hasn't — callers gate the board lens on this returning a row).
export function boardBlueprintMeta(board, cls) {
  return manifest.blueprints.find((b) => b.kind === 'board' && b.board === board && b.class === cls) || null
}

export async function loadBlueprint(examId) {
  const row = manifest.blueprints.find((b) => b.examId === examId)
  if (!row) return null
  if (!cache.has(examId)) {
    const mod = await blueprintModules[`./data/${row.path}`]()
    cache.set(examId, mod.default)
  }
  return cache.get(examId)
}

export function getBlueprint(examId) {
  return cache.get(examId) ?? null
}

// Weight of a chapter under a blueprint; 0 = untested. Null blueprint → 0,
// letting the planner's floor-to-1 rule spread time evenly.
export function weightFor(blueprint, chapterId) {
  return blueprint?.weights?.[chapterId] ?? 0
}
