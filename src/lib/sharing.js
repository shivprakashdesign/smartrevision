import { supabase } from './supabase'
import { offsetsFor } from '../engine/schedule'

// Clone a shared topic into `studentId`'s account: the topic itself, its recall
// cards, its photos (same public URLs — no re-upload) and a fresh standard
// revision schedule from today. Returns the new topic id or null.
export async function cloneSharedTopic(token, studentId) {
  const { data: src } = await supabase
    .from('topics')
    .select('*, topic_images(image_url), recall_cards(question, answer)')
    .eq('share_token', token)
    .eq('shared', true)
    .single()
  if (!src) return null

  // The clone is scheduled against the *cloning* student's exam, not the
  // sharer's — the topic is theirs now.
  const { data: me } = await supabase.from('students').select('exam_date').eq('id', studentId).single()

  const today = new Date()
  const { data: topic, error } = await supabase
    .from('topics')
    .insert({
      student_id: studentId,
      subject: src.subject,
      topic_name: src.topic_name,
      date_learned: today.toISOString().slice(0, 10),
      priority: src.priority,
      notes: src.notes,
      schedule_type: 'standard'
    })
    .select()
    .single()
  if (error || !topic) return null

  const revisions = offsetsFor(me?.exam_date, today).map(({ label, days }) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return { topic_id: topic.id, scheduled_date: d.toISOString().slice(0, 10), interval_label: label }
  })
  await supabase.from('revisions').insert(revisions)

  if (src.recall_cards?.length) {
    await supabase.from('recall_cards').insert(src.recall_cards.map(c => ({ topic_id: topic.id, question: c.question, answer: c.answer })))
  }
  if (src.topic_images?.length) {
    await supabase.from('topic_images').insert(src.topic_images.map(i => ({ topic_id: topic.id, image_url: i.image_url })))
  }
  return topic.id
}

// After a visitor arrives from a /s/<token> link and signs up, finish the job:
// credit the referrer (if any) and clone the pending topic into the new
// account. Returns the new topic id, or null if there was nothing pending.
export async function applyPendingShare(user, student) {
  const token = localStorage.getItem('sr_pending_share')
  if (!token) return null
  const ref = localStorage.getItem('sr_pending_ref')
  localStorage.removeItem('sr_pending_share')
  localStorage.removeItem('sr_pending_ref')

  // Referral attribution — best-effort, never blocks the clone.
  if (ref) {
    try {
      const { data: myAccount } = await supabase.from('accounts').select('id, referred_by_code').eq('id', user.id).single()
      if (myAccount && !myAccount.referred_by_code) {
        const code = ref.toUpperCase()
        const { data: referrerId } = await supabase.rpc('find_account_by_referral_code', { code })
        if (referrerId && referrerId !== user.id) {
          await supabase.from('accounts').update({ referred_by_code: code }).eq('id', user.id)
          await supabase.from('referral_events').insert({ referrer_account_id: referrerId, referred_account_id: user.id, reward_granted: false })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  return cloneSharedTopic(token, student.id)
}
