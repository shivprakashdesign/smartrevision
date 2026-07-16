// Photo → topics endpoint. The client sends a resized syllabus/notes photo
// (base64) plus the student's Supabase access token; this verifies the user,
// enforces a daily scan cap (each call costs money at volume), runs the
// Gemini vision extraction, and returns draft topics for the review screen.
//
// Env (Vercel): GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
// VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

import { extractTopics } from './_lib/extract.js'

export const config = {
  maxDuration: 60 // vision calls can take 10-20s; Hobby's 10s default would kill them
}

const SCANS_PER_DAY = 10
const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // ~4MB of base64; client resizes well below this
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Who is this token? Returns the account id or null.
async function verifyUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
  })
  if (!r.ok) return null
  const user = await r.json()
  return user?.id || null
}

async function db(path, init = {}) {
  // headers must merge LAST — spreading `init` after them would let
  // init.headers replace the whole object and drop the auth (a 401 we
  // debugged on-device; notify.js has the same helper with correct order).
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

    // 1. Who's asking? This endpoint spends money — no anonymous calls.
    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    const accountId = token && (await verifyUser(token))
    if (!accountId) return res.status(401).json({ error: 'unauthorized' })

    // 2. Validate the payload.
    const { image, media_type: mediaType, subjects } = req.body || {}
    if (!image || typeof image !== 'string' || !MEDIA_TYPES.has(mediaType)) {
      return res.status(400).json({ error: 'send { image: base64, media_type: image/jpeg|png|webp }' })
    }
    if (image.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'photo too large — the app should resize before uploading' })
    }

    // 3. Daily cap.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const countRes = await db(
      `scan_log?account_id=eq.${accountId}&created_at=gte.${since}&select=id`,
      { method: 'HEAD', headers: { Prefer: 'count=exact' } }
    )
    const used = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '0', 10)
    if (used >= SCANS_PER_DAY) {
      return res.status(429).json({
        error: `That's ${SCANS_PER_DAY} scans in a day — the limit for now. Try again tomorrow.`,
        remaining: 0
      })
    }

    // 4. Extract.
    const cleanSubjects = Array.isArray(subjects)
      ? subjects.filter((s) => typeof s === 'string').slice(0, 20)
      : []
    const result = await extractTopics({
      image,
      mediaType,
      subjects: cleanSubjects,
      apiKey: process.env.GEMINI_API_KEY
    })

    // 5. Log the scan (observability + the cap above).
    await db('scan_log', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountId,
        topic_count: result.topics.length,
        note: result.note || null
      })
    })

    return res.json({ ...result, remaining: SCANS_PER_DAY - used - 1 })
  } catch (e) {
    console.error('extract-topics:', e)
    // `detail` names the real failure (bad key, db error, Gemini rejection)
    // without leaking secrets — the Gemini key travels in a header, never in
    // the URL or error text.
    return res.status(500).json({
      error: 'extraction failed — please try again',
      detail: String(e.message || e).slice(0, 300)
    })
  }
}
