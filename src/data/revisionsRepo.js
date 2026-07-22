// All writes to the `revisions` table. Screens build rows with
// buildRevisionRows (pure, in engine/schedule.js) and insert here, so the
// row shape lives in exactly one place.

import { supabase } from '../lib/supabase'

// Inserts pre-built revision rows. Returns the supabase error (or null) so
// callers keep their own toast/rollback handling.
export async function insertRevisions(rows) {
  if (!rows.length) return null
  const { error } = await supabase.from('revisions').insert(rows)
  return error
}
