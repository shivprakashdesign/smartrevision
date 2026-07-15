// Called once from Home on app start. Web push replaced the old OneSignal
// plan: no native SDK needed — the installed PWA subscribes itself (see
// push.js) and api/notify.js sends. This just keeps the subscription row
// fresh; it never prompts the user.
import { syncPush } from './push'

export async function initNotifications(accountId) {
  await syncPush(accountId)
}
