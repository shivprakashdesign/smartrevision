// Sub-topic suggestions: given a chapter from the student's plan, list what's
// usually taught inside it so logging today's study is a tap, not typing.
// Text-only Gemini call — a fraction of a scan's cost.
import { geminiJson } from './extract.js'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subtopics'],
  properties: {
    subtopics: { type: 'array', items: { type: 'string' } }
  }
}

const SYSTEM = `You help school students in India break a textbook chapter into sub-topics for SmartRevision, a revision app.

Rules:
- Given a chapter name and its subject, list the sub-topics a student typically studies within that chapter, in the order they are usually taught.
- 4 to 10 sub-topics. Short names (under 60 characters), title case, student-friendly, no numbering.
- Use your knowledge of common Indian curricula (NCERT/CBSE/ICSE/state boards). Prefer the standard breakdown of that chapter when you recognise it.
- If you don't recognise the chapter or it isn't study material, return an empty list. Never invent filler.`

// Returns { subtopics: string[] } — empty when the chapter isn't recognised.
export async function suggestSubtopics({ chapter, subject, apiKey }) {
  const parsed = await geminiJson({
    system: SYSTEM,
    schema: SCHEMA,
    apiKey,
    userParts: [{ text: `Subject: ${subject || 'unknown'}\nChapter: ${chapter}` }]
  })
  const seen = new Set()
  const subtopics = []
  for (const s of parsed?.subtopics || []) {
    const name = String(s || '').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    subtopics.push(name.slice(0, 80))
    if (subtopics.length >= 10) break
  }
  return { subtopics }
}
