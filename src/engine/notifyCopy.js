// What the notification actually says. The question IS the hook: a student
// mid-scroll reads "Can you still explain Laws of Motion?" and their brain
// starts answering before their thumb decides anything. Never send
// "Time to study! 📚" — that's homework; a question is a dare.
//
// Pure functions, shared by api/notify.js (the sender) and the tests.
// Student-voice rules apply: short everyday words only.

// dueTopics: [{ revision_id, topic_name, subject }], most overdue first.
// The most overdue topic is the hero — it's also the one whose memory is
// faintest, so the question is a genuine test, not a rhetorical one.
export function dailyReminder(dueTopics) {
  if (!dueTopics || dueTopics.length === 0) return null
  const hero = dueTopics[0]
  const more = dueTopics.length - 1
  const parts = [hero.subject || 'Revision', 'takes about 3 minutes']
  // "waiting", not "due today" — the list includes overdue topics, which the
  // app files under "To review" rather than "Due Today".
  if (more > 0) parts.push(`+${more} more waiting`)
  return {
    title: `Can you still explain ${String(hero.topic_name || '').trim()}?`,
    body: parts.join(' · '),
    url: `/revise/${hero.revision_id}`,
    tag: 'daily-reminder'
  }
}

// Evening rescue: only when there's a real streak, nothing done today, and
// something actually revisable (future revisions are locked, so nudging a
// student with an empty queue would be a dead end).
export function streakNudge(streak, dueCount) {
  if (!streak || streak < 1 || !dueCount || dueCount < 1) return null
  return {
    title: `Your ${streak}-day streak needs 3 minutes 🔥`,
    body: 'One quick revision keeps it going.',
    url: '/home',
    tag: 'streak-nudge'
  }
}
