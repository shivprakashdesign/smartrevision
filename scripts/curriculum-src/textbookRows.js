// Shared row-expansion helper for the hardcoded textbook data (ncert11.js,
// ncert12.js). Keeps those files plain, transcription-friendly row arrays:
//   [chapterNumber, 'Chapter name', jeeQ, [[topicCode, 'Topic title'], …]]
//
// A chapter whose book gives no topic breakdown (e.g. GSEB Biology/Computer
// Studies list only chapter names) still needs to be plannable, so it falls
// back to a single subtopic using the chapter name itself — better than
// silently dropping out of every plan.
export function expandChapters(prefix, rows) {
  return rows.map(([number, chapter, jeeQ, topics]) => ({
    id: `${prefix}${number}`,
    number,
    chapter,
    jeeQ,
    subtopics: topics.length
      ? topics.map(([code, label]) => ({ id: `${prefix}${code}`, code, label }))
      : [{ id: `${prefix}${number}_s`, code: String(number), label: chapter }]
  }))
}
