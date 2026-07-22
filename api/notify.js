// The notification sender. Pinged every 15 minutes (Supabase pg_cron → see
// supabase/migrations/0017_push_notifications.sql) plus a once-daily Vercel cron as a safety
// net. Each run: find accounts whose local clock just passed their chosen
// reminder time, compose the question notification from their due revisions,
// send to every subscribed device, and mark the local date as sent so
// repeat runs inside the window are no-ops.
//
// Env (Vercel): SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), CRON_SECRET.
// GET /api/notify?dry=1 reports what WOULD be sent without sending.

import webpush from 'web-push'
import { dailyReminder, streakNudge } from '../src/lib/notifyCopy.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
}

async function db(path, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS, ...init })
  if (!r.ok) throw new Error(`db ${path}: ${r.status} ${await r.text()}`)
  return r.status === 204 ? null : r.json()
}

// Local wall-clock pieces for a timezone, from the same instant.
// Exported for tests.
export function localClock(tz, now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now) // YYYY-MM-DD
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now) // HH:MM
  return { date, time }
}

// True when local HH:MM is inside [target, target+15min). Runs every 15
// minutes, so each target time matches exactly one run per day. The modulo
// handles targets in the last 15 minutes of the day, whose window crosses
// midnight — without it a 23:50 reminder would never fire.
export function inWindow(localHHMM, targetHHMM) {
  const mins = (s) => {
    const [h, m] = String(s).slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }
  const diff = (mins(localHHMM) - mins(targetHHMM) + 1440) % 1440
  return diff < 15
}

async function sendToAccount(subs, payload, results) {
  const body = JSON.stringify(payload)
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      )
      results.sent++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        // Device is gone (app removed, subscription rotated) — prune it.
        await db(`push_subscriptions?id=eq.${sub.id}`, { method: 'DELETE' })
        results.pruned++
      } else {
        results.errors.push(`${e.statusCode || e.message}`)
      }
    }
  }
}

export default async function handler(req, res) {
  const auth = req.headers.authorization || ''
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  try {
    return await run(req, res)
  } catch (e) {
    // Names the failure (missing env, bad key, db error) without leaking values.
    return res.status(500).json({ error: String(e.message || e) })
  }
}

async function run(req, res) {
  // The public key is the same one the client bundles; reuse VITE_VAPID_PUBLIC_KEY
  // so setup needs only one copy of it.
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
  const missing = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VAPID_PRIVATE_KEY']
    .filter((k) => !process.env[k])
  if (!vapidPublic) missing.push('VITE_VAPID_PUBLIC_KEY')
  if (missing.length) return res.status(500).json({ error: 'missing env vars', missing })

  const dry = req.query?.dry === '1'
  // ?test=1 sends the daily question NOW to every subscribed device, ignoring
  // time windows and the once-a-day dedup, and never marks the day as sent.
  // For smoke-testing delivery after a change; still behind CRON_SECRET.
  const test = req.query?.test === '1'

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@smartrevision.app',
    vapidPublic,
    process.env.VAPID_PRIVATE_KEY
  )

  const results = { sent: 0, pruned: 0, skipped: 0, errors: [], dry, would: [] }

  // Only accounts with at least one live device matter.
  const subs = await db('push_subscriptions?select=id,account_id,endpoint,p256dh,auth')
  const byAccount = {}
  for (const s of subs) (byAccount[s.account_id] || (byAccount[s.account_id] = [])).push(s)
  const accountIds = Object.keys(byAccount)
  if (accountIds.length === 0) return res.json(results)

  const prefs = await db(
    `notification_preferences?account_id=in.(${accountIds.join(',')})&select=*`
  )

  for (const pref of prefs) {
    const tz = pref.timezone || 'Asia/Kolkata'
    const { date: localDate, time: localTime } = localClock(tz)

    const dailyDue =
      test ||
      (pref.daily_reminder_enabled &&
        pref.last_daily_sent_on !== localDate &&
        inWindow(localTime, pref.daily_reminder_time || '18:00'))
    const streakDue =
      !test &&
      pref.streak_nudge_enabled &&
      pref.last_streak_sent_on !== localDate &&
      inWindow(localTime, pref.streak_nudge_time || '21:00')

    if (!dailyDue && !streakDue) {
      results.skipped++
      continue
    }

    // This account's students → their actionable (due or overdue) revisions,
    // most overdue first, skipping archived topics.
    const students = await db(
      `students?owner_account_id=eq.${pref.account_id}&select=id,current_streak`
    )
    if (students.length === 0) continue
    const studentIds = students.map((s) => s.id).join(',')

    const rows = await db(
      `revisions?completed=eq.false&scheduled_date=lte.${localDate}` +
        `&topics.student_id=in.(${studentIds})&topics.archived=not.is.true` +
        `&select=id,scheduled_date,topics!inner(topic_name,subject,student_id,archived)` +
        `&order=scheduled_date.asc&limit=30`
    )
    // A topic with several missed reviews shows up once — the "+N more"
    // count means topics, not rows.
    const seen = new Set()
    const dueTopics = []
    for (const r of rows) {
      if (seen.has(r.topics.topic_name)) continue
      seen.add(r.topics.topic_name)
      dueTopics.push({ revision_id: r.id, topic_name: r.topics.topic_name, subject: r.topics.subject })
    }

    if (dailyDue) {
      const payload = dailyReminder(dueTopics)
      if (payload) {
        if (dry) results.would.push({ account: pref.account_id, ...payload })
        else {
          await sendToAccount(byAccount[pref.account_id], payload, results)
          if (!test) {
            await db(`notification_preferences?account_id=eq.${pref.account_id}`, {
              method: 'PATCH',
              body: JSON.stringify({ last_daily_sent_on: localDate })
            })
          }
        }
      }
    }

    if (streakDue) {
      const streak = Math.max(0, ...students.map((s) => s.current_streak || 0))
      // "Haven't revised yet today" in THEIR timezone: look at recent
      // completions and compare local dates.
      const recent = await db(
        `revisions?completed=eq.true&completed_at=gte.${new Date(Date.now() - 36 * 3600 * 1000).toISOString()}` +
          `&topics.student_id=in.(${studentIds})&select=completed_at,topics!inner(student_id)&limit=50`
      )
      const doneToday = recent.some(
        (r) => r.completed_at && localClock(tz, new Date(r.completed_at)).date === localDate
      )
      const payload = doneToday ? null : streakNudge(streak, dueTopics.length)
      if (payload) {
        if (dry) results.would.push({ account: pref.account_id, ...payload })
        else {
          await sendToAccount(byAccount[pref.account_id], payload, results)
          await db(`notification_preferences?account_id=eq.${pref.account_id}`, {
            method: 'PATCH',
            body: JSON.stringify({ last_streak_sent_on: localDate })
          })
        }
      }
    }
  }

  return res.json(results)
}
