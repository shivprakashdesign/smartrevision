import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function NotificationSettings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    loadPrefs()
  }, [user])

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
        .insert({ account_id: user.id })
        .select()
        .single()
      setPrefs(created)
    }
    setLoading(false)
  }

  async function updatePref(field, value) {
    setSaving(true)
    const updated = { ...prefs, [field]: value }
    setPrefs(updated)
    await supabase
      .from('notification_preferences')
      .update({ [field]: value })
      .eq('account_id', user.id)
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-sans text-sm">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans px-5 py-8">
      <div className="max-w-sm mx-auto">
        <Link to="/home" className="text-[12px] font-bold text-slate-400">← Back to Home</Link>
        <h1 className="text-[20px] font-bold text-brand-900 tracking-tight mt-2 mb-6">Notifications</h1>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-3"
        >
          <div className="flex justify-between items-center mb-2">
            <p className="text-[14px] font-bold text-brand-900">Daily due reminder</p>
            <input
              type="checkbox"
              checked={prefs.daily_reminder_enabled}
              onChange={(e) => updatePref('daily_reminder_enabled', e.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </div>
          <p className="text-[12px] text-slate-400 mb-3">One reminder listing what's due today</p>
          <input
            type="time"
            value={prefs.daily_reminder_time?.slice(0, 5) || '18:00'}
            onChange={(e) => updatePref('daily_reminder_time', e.target.value)}
            disabled={!prefs.daily_reminder_enabled}
            className="border border-slate-200 rounded-xl px-3 py-2 text-[13px] bg-slate-50 disabled:opacity-40"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
        >
          <div className="flex justify-between items-center mb-2">
            <p className="text-[14px] font-bold text-brand-900">Streak-at-risk nudge</p>
            <input
              type="checkbox"
              checked={prefs.streak_nudge_enabled}
              onChange={(e) => updatePref('streak_nudge_enabled', e.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </div>
          <p className="text-[12px] text-slate-400 mb-3">Only fires if you haven't revised yet and have an active streak</p>
          <input
            type="time"
            value={prefs.streak_nudge_time?.slice(0, 5) || '21:00'}
            onChange={(e) => updatePref('streak_nudge_time', e.target.value)}
            disabled={!prefs.streak_nudge_enabled}
            className="border border-slate-200 rounded-xl px-3 py-2 text-[13px] bg-slate-50 disabled:opacity-40"
          />
        </motion.div>

        {saving && <p className="text-[11px] text-slate-400 mt-3">Saving...</p>}
      </div>
    </div>
  )
}
