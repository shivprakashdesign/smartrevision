import { Capacitor } from '@capacitor/core'

// OneSignal's native SDK will be added here once we build the real Android app
// (it needs Capacitor 7, which we'll upgrade to at that point — see project notes).
// Until then, this safely does nothing in the browser.
export async function initNotifications(accountId) {
  if (!Capacitor.isNativePlatform()) {
    console.log('OneSignal: skipped — not running in a native app yet')
    return
  }
  // Real OneSignal wiring goes here later.
}
