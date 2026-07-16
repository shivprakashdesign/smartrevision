// Sub-topic suggestions endpoint. The client sends a chapter (from the
// student's plan) + their Supabase access token; this verifies the user,
// enforces a daily cap, and returns the chapter's usual sub-topics.
// Text-only and cheap, so the cap is looser than photo scans.
//
// Env (Vercel): GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
// VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { suggestSubtopics } from './_lib/suggest.js'

export const config = { maxDuration: 120 } // fits the 3-attempt retry chain

const SUGGESTS_PER_DAY = 30

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function verifyUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
  })
  if (!r.ok) return null
  const user = await r.json()
  return user?.id || null
}

async function db(path, init = {}) {
  // headers merge LAST so init.headers can't drop the auth (see extract-topics).
  const { headers, ...rest } = init
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...rest,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...headers
    }
  })
  if (!r.ok) throw new Error(`db ${path}: ${r.status}`)
  return r
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

    const missing = ['GEMINI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
      .filter((k) => !process.env[k])
    if (missing.length) return res.status(500).json({ error: 'missing env vars', missing })

    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    const accountId = token && (await verifyUser(token))
    if (!accountId) return res.status(401).json({ error: 'unauthorized' })

    const { chapter, subject } = req.body || {}
    if (!chapter || typeof chapter !== 'string' || chapter.length > 120) {
      return res.status(400).json({ error: 'send { chapter, subject }' })
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const countRes = await db(
      `scan_log?account_id=eq.${accountId}&kind=eq.suggest&created_at=gte.${since}&select=id`,
      { method: 'HEAD', headers: { Prefer: 'count=exact' } }
    )
    const used = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10)
    if (used >= SUGGESTS_PER_DAY) {
      return res.status(429).json({ error: "That's a lot of suggestions for one day — type this one in, and try again tomorrow." })
    }

    const result = await suggestSubtopics({
      chapter: chapter.trim(),
      subject: typeof subject === 'string' ? subject.trim() : '',
      apiKey: process.env.GEMINI_API_KEY
    })

    await db('scan_log', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountId,
        kind: 'suggest',
        topic_count: result.subtopics.length,
        note: chapter.trim().slice(0, 120)
      })
    })

    return res.json(result)
  } catch (e) {
    console.error('suggest-subtopics:', e)
    const detail = String(e.message || e).slice(0, 300)
    if (/^gemini (503|429)/.test(detail)) {
      return res.status(503).json({ error: 'Suggestions are busy right now — type it in, or try again in a minute.', detail })
    }
    return res.status(500).json({ error: "Couldn't get suggestions — type it in for now.", detail })
  }
}
