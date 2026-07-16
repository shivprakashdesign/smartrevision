// The exam receipt: after the exam, the student tags which topics came up on
// the paper, and this turns that into proof the system worked — "9 of the 11
// topics on your paper, already revised". Pure functions over the same topic
// rows the rest of the app loads.

// `appearedIds` = topic ids the student tagged as "this came up".
export function receiptStats(topics, appearedIds) {
  const tagged = new Set(appearedIds || [])
  const rows = []
  let revised = 0
  let reps = 0
  for (const t of topics) {
    if (!tagged.has(t.id)) continue
    const done = (t.revisions || []).filter((r) => r.completed).length
    if (done > 0) {
      revised++
      reps += done
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
  return { appeared: rows.length, revised, reps, rows }
}

// What gets shared. Student voice, screenshot-independent.
export function receiptShareText(stats) {
  return (
    `My exam receipt 🧾 ${stats.revised} of the ${stats.appeared} topics on my paper — ` +
    `I'd already revised them before exam day (${stats.reps} revisions). Made with SmartRevision.`
  )
}
