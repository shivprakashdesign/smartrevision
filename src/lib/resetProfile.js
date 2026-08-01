// Factory-reset a single student profile: delete every topic and its history,
// wipe subjects, the study plan and the class/exam/schedule setup, and zero the
// gamification records — back to a brand-new profile. Only the name is kept.
//
// Deletes are ordered children-first so this works whether or not the FK
// cascade migration has been applied — the same approach ManageSubjects uses
// to delete a single subject, widened to the whole profile.
import { supabase } from './supabase'

// Pull the storage paths out of topic_images.image_url so the actual photos are
// removed from the bucket, not just their rows. Mirrors ManageSubjects.
async function removeTopicPhotos(topicIds) {
  const { data: imgs } = await supabase
    .from('topic_images').select('image_url').in('topic_id', topicIds)
  const marker = '/topic-images/'
  const paths = (imgs || [])
    .map(im => { const at = im.image_url.indexOf(marker); return at >= 0 ? decodeURIComponent(im.image_url.slice(at + marker.length)) : null })
    .filter(Boolean)
  if (paths.length) await supabase.storage.from('topic-images').remove(paths)
}

// clearAccountSubjects: only true when this student is the sole profile on the
// account. accounts.subjects is shared across a parent's children, so a
// per-child reset must not wipe a sibling's picker selections.
export async function resetProfileData(student, { clearAccountSubjects = false } = {}) {
  if (!student) return { error: new Error('No student') }
  const sid = student.id

  // 1. Topics and everything hanging off them.
  const { data: topicRows, error: topicErr } = await supabase
    .from('topics').select('id').eq('student_id', sid)
  if (topicErr) return { error: topicErr }
  const topicIds = (topicRows || []).map(t => t.id)

  if (topicIds.length) {
    await removeTopicPhotos(topicIds)
    // Children with no ON DELETE CASCADE must go before the topics themselves.
    await supabase.from('topic_images').delete().in('topic_id', topicIds)
    await supabase.from('recall_cards').delete().in('topic_id', topicIds)
    await supabase.from('journal_entries').delete().in('topic_id', topicIds)
    await supabase.from('revisions').delete().in('topic_id', topicIds)
    const { error } = await supabase.from('topics').delete().eq('student_id', sid)
    if (error) return { error }
  }

  // 2. Study-plan and derived learning data (each cascades its own children).
  await supabase.from('plan_items').delete().eq('student_id', sid)
  await supabase.from('missions').delete().eq('student_id', sid)   // → mission_items
  await supabase.from('exam_recaps').delete().eq('student_id', sid)

  // 3. Zero the records, subjects, and the class/exam/schedule setup — every
  // resettable column back to its fresh-account default. Only `name` is kept.
  const { error: resetErr } = await supabase.from('students').update({
    gems: 0,
    current_streak: 0,
    longest_streak: 0,
    streak_freezes: 1,                  // a fresh account starts with one (migration default)
    last_activity_date: null,
    subject_colors: {},
    weak_subjects: [],
    daily_study_min: null,
    exam_lens: null,
    // Factory reset: also drop who/where they study. class_id null → off the
    // class leaderboard. study_days/board are NOT NULL, so reset to defaults.
    class_id: null,
    class_grade: null,
    exam_date: null,
    study_days: [1, 2, 3, 4, 5, 6],
    board: 'CBSE'
  }).eq('id', sid)
  if (resetErr) return { error: resetErr }

  // 4. The onboarding-chosen subject list lives on the account, shared by
  // siblings — only clear it when this profile owns the account alone.
  if (clearAccountSubjects && student.owner_account_id) {
    await supabase.from('accounts').update({ subjects: [] }).eq('id', student.owner_account_id)
  }

  return { error: null }
}
