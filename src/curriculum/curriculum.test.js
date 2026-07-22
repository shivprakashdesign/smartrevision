// Validation for the generated CKB data (src/curriculum/data). These tests
// guard the contracts student data depends on:
//   - ids are globally unique and APPEND-ONLY (never renamed/removed — student
//     rows reference them via curriculum_topic_id forever)
//   - blueprints only price chapters that exist
//   - published totals stay as published (pinned sums)
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const DATA = path.join(__dirname, 'data')
const read = (rel) => JSON.parse(readFileSync(path.join(DATA, rel), 'utf8'))

const manifest = read('index.json')
const subjectFiles = manifest.subjects.map((s) => ({ meta: s, file: read(s.path) }))
const blueprintFiles = manifest.blueprints.map((b) => ({ meta: b, file: read(b.path) }))

const allChapterIds = new Set()
const allIds = []
for (const { file } of subjectFiles) {
  for (const ch of file.chapters) {
    allChapterIds.add(ch.id)
    allIds.push(ch.id)
    for (const t of ch.topics) allIds.push(t.id)
  }
}

describe('curriculum data', () => {
  it('manifest paths all resolve and counts match the files', () => {
    for (const { meta, file } of subjectFiles) {
      expect(file.chapters.length).toBe(meta.chapterCount)
      expect(file.chapters.reduce((n, c) => n + c.topics.length, 0)).toBe(meta.topicCount)
      expect(file.subjectCode).toBe(meta.subjectCode)
    }
  })

  it('ids are globally unique', () => {
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('ids are append-only: every snapshotted id still exists', () => {
    const snapshot = read('id-snapshot.json')
    const current = new Set(allIds)
    const gone = snapshot.filter((id) => !current.has(id))
    expect(gone).toEqual([])
  })

  it('every topic carries an explicit study-time estimate', () => {
    for (const { file } of subjectFiles) {
      for (const ch of file.chapters) {
        expect(ch.estimatedStudyTimeMin).toBeGreaterThan(0)
        for (const t of ch.topics) expect(t.estimatedStudyTimeMin).toBeGreaterThan(0)
      }
    }
  })

  it('data dir contains no files the manifest does not list', () => {
    const listed = new Set([
      'index.json', 'id-snapshot.json',
      ...manifest.subjects.map((s) => s.path),
      ...manifest.blueprints.map((b) => b.path)
    ])
    const walk = (dir) =>
      readdirSync(path.join(DATA, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name))
          : e.name.endsWith('.json') ? [path.join(dir, e.name)]
          : []
      )
    for (const f of walk('')) expect(listed.has(f)).toBe(true)
  })
})

describe('blueprints', () => {
  it('only price chapters that exist in the curriculum', () => {
    for (const { meta, file } of blueprintFiles) {
      for (const id of Object.keys(file.weights)) {
        expect(allChapterIds.has(id), `${meta.examId} weights unknown chapter ${id}`).toBe(true)
      }
    }
  })

  const sum = (weights, re) =>
    Object.entries(weights).filter(([k]) => re.test(k)).reduce((s, [, v]) => s + v, 0)

  it('GSEB Class 12 totals stay as published', () => {
    const g = blueprintFiles.find((b) => b.meta.examId === 'gseb-board-12').file
    expect(sum(g.weights, /^p\d+$/)).toBe(100)  // Physics
    expect(sum(g.weights, /^c\d+$/)).toBe(100)  // Chemistry
    // The board's own blueprint sums to 109 on a 100-mark paper (internal
    // choice overlap in the source PDF) — stored as published, not normalised.
    expect(sum(g.weights, /^m\d+$/)).toBe(109)  // Maths
    expect(sum(g.weights, /^b12_\d+$/)).toBe(100) // Biology (prescribed weightage)
    expect(sum(g.weights, /^cs12_\d+$/)).toBe(100) // Computer Studies theory
  })

  it('jee-main covers both classes and never weights Biology or English', () => {
    const jee = blueprintFiles.find((b) => b.meta.examId === 'jee-main').file
    const ids = Object.keys(jee.weights)
    expect(ids.some((id) => /^p\d+$/.test(id))).toBe(true)    // Class 12 Physics
    expect(ids.some((id) => /^p11_/.test(id))).toBe(true)     // Class 11 Physics
    expect(ids.some((id) => /^(b1[12]_|e11_)/.test(id))).toBe(false)
  })

  it('GSEB Class 11 has no board blueprint yet (lens must stay gated)', () => {
    expect(blueprintFiles.some((b) => b.meta.examId === 'gseb-board-11')).toBe(false)
  })
})
