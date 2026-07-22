// Today's Mission — the coach-mode hero on Home (Classes 11–12 only; see
// coachModeEnabled). "How long do you have today?" → one balanced list of
// revisions, gentle recovery and new learning from the active chapters.
// All decisions come from the pure engine (engine/mission.js); this component
// only gathers inputs, renders the result and persists acceptance.
//
// Items store identities, so status here is LIVE: a revision completed from
// anywhere shows as done instead of being asked twice.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { Target02Icon, RefreshIcon, Cancel01Icon, Tick02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { buildMission, itemKey } from '../engine/mission'
import { memoryHealthLabel } from '../engine/recovery'
import { loadSubject } from '../curriculum/ckb'
import { loadBlueprint } from '../curriculum/blueprints'
import { fetchPlanItems } from '../data/planItemsRepo'
import { fetchMission, saveMission, abandonMission } from '../data/missionsRepo'
import { subjectColor } from '../lib/subjects'

const todayISO = () => new Date().toISOString().slice(0, 10)

const KIND_LABEL = {
  revision: 'Revise',
  recovery: 'Catch up',
  new: 'Learn'
}
const KIND_CLS = {
  revision: 'text-emerald-600 bg-emerald-500/12',
  recovery: 'text-brand-500 bg-brand-500/12',
  new: 'text-violet-600 bg-violet-500/12'
}

function minutesLabel(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

// Live done-ness for a persisted or previewed item.
function itemDone(it, topics) {
  const revisionId = it.revision_id ?? it.revisionId
  if (revisionId) {
    for (const t of topics) {
      const r = (t.revisions || []).find((r) => r.id === revisionId)
      if (r) return !!r.completed
    }
    return false
  }
  const ckbId = it.curriculum_topic_id ?? it.curriculumTopicId
  if (ckbId && topics.some((t) => t.curriculum_topic_id === ckbId)) return true
  const planId = it.plan_item_id ?? it.planItemId
  return !!planId && topics.some((t) => t.plan_item_id === planId && t.topic_name === it.label)
}

export default function MissionCard({ student, topics }) {
  const navigate = useNavigate()
  const [inputs, setInputs] = useState(null)      // { planItems, curriculum, blueprint }
  const [saved, setSaved] = useState(undefined)   // undefined = loading, null = none yet
  const [minutes, setMinutes] = useState(student.daily_study_min || 60)
  const [seed, setSeed] = useState(0)
  const [excluded, setExcluded] = useState([])
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const cls = Number(student.class_grade)
  const board = student.board || 'CBSE'
  const lens = student.exam_lens || 'jee'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [planItems, mission] = await Promise.all([
        fetchPlanItems(student.id),
        fetchMission(student.id, todayISO())
      ])
      // CKB chapters for the active, linked chapters — per-subject lazy chunks.
      const activeSubjects = [...new Set(planItems.filter((pi) => pi.active && pi.curriculum_chapter_id).map((pi) => pi.subject))]
      const files = await Promise.all(activeSubjects.map((s) => loadSubject(cls, s)))
      const curriculum = new Map()
      for (const f of files) if (f) for (const ch of f.chapters) curriculum.set(ch.id, ch)
      const examId = lens === 'board' ? `${board.toLowerCase()}-board-${cls}` : 'jee-main'
      const blueprint = await loadBlueprint(examId)
      if (cancelled) return
      setInputs({ planItems, curriculum, blueprint })
      setSaved(mission && mission.status === 'accepted' ? mission : null)
    })()
    return () => { cancelled = true }
  }, [student.id])

  const engineArgs = useMemo(() => inputs && {
    topics: topics.filter((t) => !t.archived),
    planItems: inputs.planItems,
    curriculum: inputs.curriculum,
    blueprint: inputs.blueprint,
    weakSubjects: student.weak_subjects || []
  }, [inputs, topics, student.weak_subjects])

  function plan(nextSeed = seed, nextExcluded = excluded) {
    const m = buildMission({ ...engineArgs, availableMin: minutes, seed: nextSeed, excluded: nextExcluded })
    if (!m.feasible) {
      toast(m.reason === 'no-time' ? 'Give it at least 10 minutes 🙂' : 'Nothing to plan yet — log a topic or pick chapters first.')
      return
    }
    setPreview(m)
  }

  function regenerate() {
    const next = seed + 1
    setSeed(next)
    plan(next)
  }

  function removeItem(it) {
    const next = [...excluded, itemKey(it)]
    setExcluded(next)
    plan(seed, next)
  }

  async function accept() {
    setSaving(true)
    const { error } = await saveMission(student.id, todayISO(), { ...preview, seed })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setSaved(await fetchMission(student.id, todayISO()))
    setPreview(null)
    toast.success("Mission set — see you at the finish 🏁")
  }

  async function changePlan() {
    if (saved) await abandonMission(saved.id)
    setSaved(null)
    setPreview(null)
    setSeed(0)
    setExcluded([])
  }

  function openItem(it) {
    if (itemDone(it, topics)) return
    const revisionId = it.revision_id ?? it.revisionId
    if (revisionId) {
      navigate(`/revise/${revisionId}`)
    } else {
      navigate('/add-topic', {
        state: {
          planItemId: it.plan_item_id ?? it.planItemId,
          topicName: it.label,
          curriculumTopicId: it.curriculum_topic_id ?? it.curriculumTopicId
        }
      })
    }
  }

  const shell = 'bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm mb-4 animate-enter overflow-hidden'

  if (saved === undefined || !inputs) return null

  // ---- accepted: today's list, live status ----------------------------------
  if (saved) {
    const items = saved.mission_items
    const done = items.filter((it) => itemDone(it, topics)).length
    const allDone = done === items.length
    return (
      <div className={shell}>
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
              <HugeiconsIcon icon={Target02Icon} size={14} strokeWidth={2.2} /> Today's mission
            </p>
            <button type="button" onClick={changePlan} className="text-[11px] font-bold text-[var(--muted)] underline underline-offset-2">
              Change
            </button>
          </div>
          <p className="text-[13px] text-[var(--slate-txt)] mt-1">
            {allDone
              ? 'All done for today — genuinely impressive. 🎉'
              : <><b className="text-[var(--ink)]">{done} of {items.length}</b> done · about {minutesLabel(saved.available_min)} today</>}
          </p>
        </div>
        <div className="px-2 pb-2">
          {items.map((it) => {
            const isDone = itemDone(it, topics)
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => openItem(it)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-2xl text-left transition ${isDone ? 'opacity-55' : 'active:bg-[var(--card-alt)]'}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)]'}`}>
                  {isDone && <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] font-semibold leading-snug truncate ${isDone ? 'text-[var(--muted)] line-through' : 'text-[var(--ink)]'}`}>{it.label}</span>
                  <span className="block text-[11px] font-semibold" style={{ color: subjectColor(it.subject) }}>{it.subject}</span>
                </span>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${KIND_CLS[it.kind]}`}>{KIND_LABEL[it.kind]}</span>
                <span className="shrink-0 text-[11px] font-bold text-[var(--muted)] w-11 text-right">{minutesLabel(it.planned_min)}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- preview: accept / regenerate / trim ----------------------------------
  if (preview) {
    return (
      <div className={shell}>
        <div className="p-4 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <HugeiconsIcon icon={Target02Icon} size={14} strokeWidth={2.2} /> Your {minutesLabel(preview.availableMin)}, well spent
          </p>
          {preview.memoryHealth != null && (
            <p className="text-[12px] text-[var(--muted)] mt-1">
              Memory health <b className="text-[var(--ink)]">{preview.memoryHealth}%</b> · {memoryHealthLabel(preview.memoryHealth)}
            </p>
          )}
        </div>
        <div className="px-2">
          <AnimatePresence initial={false}>
            {preview.items.map((it) => (
              <motion.div
                key={itemKey(it)}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex items-center gap-2.5 px-2 py-2"
              >
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${KIND_CLS[it.kind]}`}>{KIND_LABEL[it.kind]}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-[var(--ink)] leading-snug truncate">{it.label}</span>
                  <span className="block text-[11px] font-semibold" style={{ color: subjectColor(it.subject) }}>{it.subject}</span>
                </span>
                <span className="shrink-0 text-[11px] font-bold text-[var(--muted)]">{minutesLabel(it.plannedMin)}</span>
                <button type="button" onClick={() => removeItem(it)} aria-label={`Remove ${it.label}`} className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[var(--muted)] active:bg-[var(--card-alt)]">
                  <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2.2} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2 p-4 pt-3">
          <button
            type="button"
            onClick={accept}
            disabled={saving}
            className="flex-1 py-2.5 rounded-2xl bg-brand-500 text-white font-bold text-[13px] active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {saving ? 'Saving…' : "Let's go"}
          </button>
          <button
            type="button"
            onClick={regenerate}
            className="px-4 py-2.5 rounded-2xl border border-[var(--border)] text-[13px] font-bold text-[var(--slate-txt)] active:scale-[0.97] transition-transform inline-flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={RefreshIcon} size={15} strokeWidth={2.2} /> Mix it up
          </button>
        </div>
      </div>
    )
  }

  // ---- ask: how long today? --------------------------------------------------
  const hasAnything = topics.length > 0 || inputs.planItems.length > 0
  return (
    <div className={shell}>
      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
          <HugeiconsIcon icon={Target02Icon} size={14} strokeWidth={2.2} /> Today's mission
        </p>
        {hasAnything ? (
          <>
            <p className="text-[15px] font-bold text-[var(--ink)]">How long can you study today?</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {[30, 60, 90, 120, 180].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`px-3.5 py-2 rounded-full text-[13px] font-bold border transition ${
                    minutes === m ? 'bg-brand-500 border-brand-500 text-white' : 'border-[var(--border)] text-[var(--slate-txt)]'
                  }`}
                >
                  {minutesLabel(m)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => plan()}
              className="w-full mt-3 py-2.5 rounded-2xl bg-brand-500 text-white font-bold text-[13px] active:scale-[0.97] transition-transform inline-flex items-center justify-center gap-1.5"
            >
              Plan my day <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2.4} />
            </button>
          </>
        ) : (
          <p className="text-[13px] text-[var(--slate-txt)]">
            Your coach kicks in once there's something to plan — <Link to="/pick-syllabus" className="font-bold text-brand-500">pick your chapters</Link> to start.
          </p>
        )}
      </div>
    </div>
  )
}
