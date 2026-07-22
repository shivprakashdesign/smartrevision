// The exam receipt: after the exam, the student tags which topics came up on
// the paper, and this turns that into proof the system worked — three honest
// numbers, not one:
//   coverage   — of what appeared, how much had you revised? ("were you ready")
//   aim        — of what you prepared, how much appeared? ("did you focus on
//                the right things" — a look back at the student's own guess)
//   confidence — of what you revised and it appeared, how did it feel? (the
//                self-graded recall_quality from those revisions)
// Pure functions over the same topic rows the rest of the app loads. `topics`
// must already be scoped to what could plausibly have been on THIS exam —
// the caller filters to date_learned <= exam date before calling in.

// Most recent self-graded quality among a topic's completed revisions, or
// null when nothing was graded. Exported for direct testing.
export function lastRecallQuality(revisions) {
  const graded = (revisions || [])
    .filter((r) => r.completed && r.recall_quality)
    .sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1))
  return graded.length ? graded[graded.length - 1].recall_quality : null
}

// `appearedIds` = topic ids the student tagged as "this came up".
export function receiptStats(topics, appearedIds) {
  const tagged = new Set(appearedIds || [])
  const rows = []
  let revised = 0
  let reps = 0
  let prepared = 0 // ALL in-scope topics with real revision effort, tagged or not
  const confidence = { good: 0, okay: 0, struggled: 0 }

  for (const t of topics) {
    const completedRevs = (t.revisions || []).filter((r) => r.completed)
    const done = completedRevs.length
    if (done > 0) prepared++

    if (!tagged.has(t.id)) continue
    if (done > 0) {
      revised++
      reps += done
      const quality = lastRecallQuality(completedRevs)
      if (quality) confidence[quality]++
    }
    rows.push({
      id: t.id,
      topic_name: t.topic_name,
      subject: t.subject || 'General',
      revised: done > 0,
      reps: done
    })
  }
  // Revised topics first — the receipt celebrates what worked.
  rows.sort((a, b) => Number(b.revised) - Number(a.revised))

  const appeared = rows.length
  return {
    appeared,
    revised,
    reps,
    prepared,
    confidence,
    // Percents, not fractions — null (not 0) when there's nothing to divide by,
    // so the caller can hide the line instead of showing a fake "0%".
    coverage: appeared > 0 ? Math.round((revised / appeared) * 100) : null,
    aim: prepared > 0 ? Math.round((revised / prepared) * 100) : null,
    rows
  }
}

// What gets shared. Student voice, screenshot-independent.
export function receiptShareText(stats) {
  const parts = [
    `My exam receipt 🧾 ${stats.revised} of the ${stats.appeared} topics on my paper — ` +
      `I'd already revised them before exam day (${stats.reps} revisions).`
  ]
  if (stats.aim != null) {
    parts.push(`I prepped ${stats.prepared} topics — ${stats.aim}% of them actually showed up.`)
  }
  parts.push('Made with SmartRevision.')
  return parts.join(' ')
}
