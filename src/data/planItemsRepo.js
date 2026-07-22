// Reads/writes for plan_items — the chapter checklist that doubles as the
// student's roadmap (position = their order, active = the chapter they're on).

import { supabase } from '../lib/supabase'

export async function fetchPlanItems(studentId) {
  const { data, error } = await supabase
    .from('plan_items')
    .select('id, subject, chapter_name, status, position, active, curriculum_chapter_id')
    .eq('student_id', studentId)
    .order('subject')
    .order('position')
  if (error) console.error(error)
  return data || []
}

// Make one chapter the subject's active chapter (clears the previous one —
// the partial unique index enforces at most one per subject).
export async function setActiveChapter(studentId, subject, itemId) {
  await supabase.from('plan_items')
    .update({ active: false })
    .eq('student_id', studentId)
    .eq('subject', subject)
    .eq('active', true)
  const { error } = await supabase.from('plan_items').update({ active: true }).eq('id', itemId)
  return error
}

export async function updatePlanItemStatus(itemId, status) {
  const { error } = await supabase.from('plan_items').update({ status }).eq('id', itemId)
  return error
}
