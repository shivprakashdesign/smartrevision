import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, AlarmClockIcon, Fire02Icon, SmartPhone01Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import Toggle from '../lib/Toggle'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getPushState, subscribePush, unsubscribePush } from '../lib/push'

// The per-device on/off card. Push needs the permission prompt to happen
// inside a tap (iOS rule), so this is a real button, not a background ask.
// Exported for the design-review harness.
export function DeviceCard({ state, busy, onEnable, onDisable }) {
  const copy = {
    'need-install': {
      title: 'Add SmartRevision to your Home Screen first',
      desc: 'Notifications only work from the installed app. Share → Add to Home Screen, then come back here.'
    },
    unsupported: {
      title: "This browser can't get notifications",
      desc: 'Open SmartRevision on your phone to turn them on there.'
    },
    denied: {
      title: 'Notifications are blocked',
      desc: 'Allow notifications for SmartRevision in your phone settings, then come back.'
    },
    off: {
      title: 'Turn on notifications on this phone',
      desc: "You'll get one quick memory question a day — nothing spammy."
    },
    subscribed: {
      title: 'This phone gets your reminders ✓',
      desc: 'One quick memory question a day, at the times below.'
    }
  }[state] || { title: 'Checking this device…', desc: '' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm p-5"
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/15">
          <HugeiconsIcon icon={SmartPhone01Icon} size={20} strokeWidth={2} color="#059669" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[var(--ink)] leading-tight">{copy.title}</p>
          <p className="text-[12.5px] text-[var(--muted)] mt-1 leading-snug">{copy.desc}</p>
          {state === 'off' && (
            <button
              type="button"
              onClick={onEnable}
              disabled={busy}
              className="mt-3 px-4 py-2.5 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {busy ? 'Turning on…' : 'Turn on'}
            </button>
          )}
          {state === 'subscribed' && (
            <button
              type="button"
              onClick={onDisable}
              disabled={busy}
              className="mt-3 text-[12px] font-bold text-[var(--muted)] underline underline-offset-2 active:opacity-70"
            >
              Turn off on this phone
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// '18:00:00' | '18:00' -> '6:00 PM' (locale-aware)
function prettyTime(value) {
  const [h, m] = (value || '00:00').split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function Skeleton() {
  return (
    <AppShell><div className="px-5 pt-6 pb-10">
      <div className="max-w-sm mx-auto">
        <div className="h-4 w-20 rounded-full bg-[var(--card-alt)] animate-pulse mb-5" />
        <div className="h-7 w-40 rounded-full bg-[var(--card-alt)] animate-pulse mb-2" />
        <div className="h-4 w-64 rounded-full bg-[var(--card-alt)] animate-pulse mb-6" />
        <div className="space-y-3">
          {[0, 1].map(i => <div key={i} className="h-32 rounded-3xl bg-[var(--card-alt)] animate-pulse" />)}
        </div>
      </div>
    </div></AppShell>
  )
}

function ReminderCard({ icon, tint, iconColor, title, desc, enabled, time, onToggle, onTime, everyLabel, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
      className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden"
    >
      <div className="flex items-start gap-3 p-5">
        <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${tint}`}>
          <HugeiconsIcon icon={icon} size={20} strokeWidth={2} color={iconColor} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[var(--ink)] leading-tight">{title}</p>
          <p className="text-[12.5px] text-[var(--muted)] mt-1 leading-snug">{desc}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} label={title} />
      </div>

      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-5 mb-5 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[var(--ink)]">Time</p>
                <p className="text-[12px] text-[var(--muted)] truncate">{everyLabel} {prettyTime(time)}</p>
              </div>
              <input
                type="time"
                value={(time || '').slice(0, 5)}
                onChange={e => onTime(e.target.value)}
                className="border border-[var(--border)] rounded-2xl px-3 py-2.5 text-[14px] font-bold text-[var(--ink)] bg-[var(--card-alt)] shrink-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function NotificationSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pushState, setPushState] = useState(null)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    loadPrefs()
    getPushState().then(setPushState)
  }, [user])

  const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

  async function loadPrefs() {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('account_id', user.id)
      .maybeSingle()

    if (data) {
      setPrefs(data)
    } else {
      const { data: created } = await supabase
        .from('notification_preferences')
        .insert({ account_id: user.id, timezone: deviceTimezone() })
        .select()
        .single()
      setPrefs(created)
    }
    setLoading(false)
  }

  // Optimistic: flip locally, then roll back if the write fails so the UI never
  // claims a setting that didn't persist. Every write also refreshes the
  // timezone — the sender fires on the student's local clock.
  async function updatePref(field, value) {
    const previous = prefs[field]
    setPrefs(p => ({ ...p, [field]: value }))
    const { error } = await supabase
      .from('notification_preferences')
      .update({ [field]: value, timezone: deviceTimezone() })
      .eq('account_id', user.id)
    if (error) {
      setPrefs(p => ({ ...p, [field]: previous }))
      toast.error(error.message)
    }
  }

  async function enablePush() {
    setPushBusy(true)
    const result = await subscribePush(user.id)
    setPushBusy(false)
    if (result === 'subscribed') {
      setPushState('subscribed')
      toast.success('This phone will get your reminders 🎉')
    } else if (result === 'denied') {
      setPushState('denied')
    } else {
      toast.error("Couldn't turn notifications on — please try again.")
    }
  }

  async function disablePush() {
    setPushBusy(true)
    await unsubscribePush()
    setPushBusy(false)
    setPushState('off')
  }

  if (loading) return <Skeleton />

  const activeCount = (prefs.daily_reminder_enabled ? 1 : 0) + (prefs.streak_nudge_enabled ? 1 : 0)

  return (
    <AppShell><div className="px-5 pt-6 pb-10">
      <div className="max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--muted)] active:opacity-70 transition-opacity mb-4"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} /> Back
        </button>

        <h1 className="text-[22px] font-bold text-[var(--ink)] tracking-tight">Notifications</h1>
        <p className="text-[14px] text-[var(--muted)] mt-1 mb-5">
          {activeCount === 0
            ? 'All reminders are off — you won’t be nudged.'
            : `${activeCount} reminder${activeCount === 1 ? '' : 's'} on. Choose when we nudge you.`}
        </p>

        <div className="space-y-3">
          <DeviceCard state={pushState} busy={pushBusy} onEnable={enablePush} onDisable={disablePush} />

          <ReminderCard
            icon={AlarmClockIcon}
            tint="bg-brand-500/15"
            iconColor="hsl(213,96%,56%)"
            title="Daily memory question"
            desc={'A question from your most overdue topic — like "Can you still explain Laws of Motion?"'}
            everyLabel="Every day at"
            enabled={prefs.daily_reminder_enabled}
            time={prefs.daily_reminder_time || '18:00'}
            onToggle={v => updatePref('daily_reminder_enabled', v)}
            onTime={v => updatePref('daily_reminder_time', v)}
            delay={0}
          />

          <ReminderCard
            icon={Fire02Icon}
            tint="bg-amber-500/15"
            iconColor="#f59e0b"
            title="Streak-at-risk nudge"
            desc="Only fires if you haven't revised yet and have an active streak."
            everyLabel="Checks in at"
            enabled={prefs.streak_nudge_enabled}
            time={prefs.streak_nudge_time || '21:00'}
            onToggle={v => updatePref('streak_nudge_enabled', v)}
            onTime={v => updatePref('streak_nudge_time', v)}
            delay={0.05}
          />
        </div>

        <p className="text-[11px] text-[var(--slate-txt)] text-center mt-5 leading-relaxed">
          Times use your phone's clock. Reminders only send when something is actually due.
        </p>
      </div>
    </div></AppShell>
  )
}
