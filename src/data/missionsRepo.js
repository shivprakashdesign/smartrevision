// Reads/writes for missions + mission_items. A mission stores identities and
// planned minutes; live done/undone status is re-derived by the renderer from
// revisions/topics, so completing work anywhere keeps the mission honest.

import { supabase } from '../lib/supabase'

export async function fetchMission(studentId, dateISO) {
  const { data, error } = await supabase
    .from('missions')
    .select('id, mission_date, available_min, status, seed, mission_items(id, kind, subject, label, curriculum_topic_id, plan_item_id, topic_id, revision_id, planned_min, position, pinned, state)')
    .eq('student_id', studentId)
    .eq('mission_date', dateISO)
    .maybeSingle()
  if (error) console.error(error)
  if (data) data.mission_items.sort((a, b) => a.position - b.position)
  return data || null
}

// Persist an accepted mission (replacing today's previous one, if any).
export async function saveMission(studentId, dateISO, mission) {
  const { data: row, error } = await supabase
    .from('missions')
    .upsert(
      {
        student_id: studentId,
        mission_date: dateISO,
        available_min: mission.availableMin,
        status: 'accepted',
        seed: mission.seed ?? 0,
        engine_version: mission.engineVersion
      },
      { onConflict: 'student_id,mission_date' }
    )
    .select()
    .single()
  if (error || !row) return { error }

  await supabase.from('mission_items').delete().eq('mission_id', row.id)
  const items = mission.items.map((it) => ({
    mission_id: row.id,
    kind: it.kind,
    subject: it.subject ?? null,
    label: it.label,
    curriculum_topic_id: it.curriculumTopicId ?? null,
    plan_item_id: it.planItemId ?? null,
    topic_id: it.topicId ?? null,
    revision_id: it.revisionId ?? null,
    planned_min: it.plannedMin,
    position: it.position,
    pinned: it.pinned ?? false
  }))
  const { error: itemsError } = await supabase.from('mission_items').insert(items)
  return { error: itemsError, missionId: row.id }
}

export async function abandonMission(missionId) {
  const { error } = await supabase.from('missions').update({ status: 'abandoned' }).eq('id', missionId)
  return error
}
