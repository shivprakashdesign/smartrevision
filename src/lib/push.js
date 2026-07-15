// Client side of web push: register the service worker, ask permission
// (must happen inside a tap on iOS), and keep the subscription row in
// Supabase in sync so api/notify.js knows where to send.
import { supabase } from './supabase'

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Push API wants the VAPID key as a Uint8Array, not base64url.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

// What the settings screen should show for this device:
//   'need-install' — iOS Safari tab; push only works from the Home Screen app
//   'unsupported'  — browser has no push at all
//   'denied'       — user blocked notifications in system settings
//   'subscribed'   — this device is set up
//   'off'          — supported, just not turned on yet
export async function getPushState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !isInstalled() ? 'need-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'subscribed' : 'off'
}

async function saveSubscription(accountId, sub) {
  const { endpoint, keys } = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { account_id: accountId, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: navigator.userAgent },
    { onConflict: 'endpoint' }
  )
  return !error
}

// Call from a user tap. Returns 'subscribed' | 'denied' | 'failed'.
export async function subscribePush(accountId) {
  if (!PUBLIC_KEY) {
    console.error('push: VITE_VAPID_PUBLIC_KEY is not set')
    return 'failed'
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
      }))
    return (await saveSubscription(accountId, sub)) ? 'subscribed' : 'failed'
  } catch (e) {
    console.error('push: subscribe failed', e)
    return 'failed'
  }
}

export async function unsubscribePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

// Silent upkeep on app start: if this device is already subscribed, make sure
// the row still exists (e.g. after the user cleared and re-created their
// account, or the first save failed offline). Never prompts.
export async function syncPush(accountId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await saveSubscription(accountId, sub)
  } catch {
    // best-effort only
  }
}
