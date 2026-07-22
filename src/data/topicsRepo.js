// The one topics+revisions read used by Home, Topics, Progress and the
// forecast surfaces. One superset of columns instead of three hand-rolled
// variants; the nested revisions select is what every metric consumes.

import { supabase } from '../lib/supabase'

export const REVISION_COLUMNS =
  'id, scheduled_date, interval_label, completed, completed_at, recall_quality'

export async function fetchTopicsWithRevisions(studentId, { includeArchived = false } = {}) {
  let query = supabase
    .from('topics')
    .select(`id, subject, topic_name, date_learned, priority, archived, revisions(${REVISION_COLUMNS})`)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (!includeArchived) query = query.not('archived', 'is', true)
  const { data, error } = await query
  if (error) console.error(error)
  return data || []
}
