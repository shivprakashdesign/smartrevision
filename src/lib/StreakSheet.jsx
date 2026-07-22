import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick02Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { supabase } from './supabase'
import { activeDates } from '../engine/metrics'

const FREEZE_PRICE = 50
const MAX_FREEZES = 2
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const ERR = {
  max_reached: 'You already hold the maximum of 2 freezes.',
  not_enough_gems: `You need ${FREEZE_PRICE} gems to buy a freeze.`,
  not_authorized: "Couldn't buy a freeze — please try again."
}

function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// One weekday cell: done (revised), missed (past, no revision), today, or future.
function DayCell({ letter, state }) {
  let inner
  if (state === 'done' || state === 'today-done') {
    inner = (
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${state === 'today-done' ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-600'}`}>
        <HugeiconsIcon icon={Tick02Icon} size={17} strokeWidth={3} />
      </div>
    )
  } else if (state === 'missed') {
    inner = (
      <div className="w-9 h-9 rounded-full bg-[var(--card-alt)] text-[var(--muted)] flex items-center justify-center">
        <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2.5} />
      </div>
    )
  } else if (state === 'today') {
    inner = <div className="w-9 h-9 rounded-full border-2 border-amber-400" />
  } else {
    inner = <div className="w-9 h-9 rounded-full border-2 border-dashed border-[var(--border)]" />
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      {inner}
      <span className="text-[12px] font-bold text-[var(--muted)]">{letter}</span>
    </div>
  )
}

export default function StreakSheet({ open, onClose, student, topics = [], onChanged }) {
  const [buying, setBuying] = useState(false)
  const streak = student?.current_streak || 0
  const gems = student?.gems || 0
  const freezes = student?.streak_freezes || 0

  const atMax = freezes >= MAX_FREEZES
  const tooPoor = gems < FREEZE_PRICE
  const canBuy = !atMax && !tooPoor && !buying

  // This week (Sunday-start, matching the home strip) with per-day streak state.
  const active = activeDates(topics)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = isoOf(today)
  const start = new Date(today); start.setDate(start.getDate() - start.getDay())
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const ds = isoOf(d)
    const isActive = active.has(ds)
    let state
    if (ds === todayStr) state = isActive ? 'today-done' : 'today'
    else if (ds > todayStr) state = 'future'
    else state = isActive ? 'done' : 'missed'
    return { letter: DOW[i], state }
  })

  async function buyFreeze() {
    if (!student || !canBuy) return
    setBuying(true)
    const { data, error } = await supabase.rpc('buy_streak_freeze', { p_student_id: student.id })
    setBuying(false)
    if (error || !data?.ok) {
      toast.error(ERR[data?.error] || 'Something went wrong.')
      return
    }
    toast.success('Streak freeze banked 🧊')
    onChanged?.()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-[28px] sm:rounded-3xl border border-[var(--border)] shadow-lg overflow-hidden"
            style={{
              backgroundColor: 'var(--card)',
              backgroundImage: 'linear-gradient(180deg, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0) 46%)',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
            }}
          >
            <div className="p-5">
              <div className="flex justify-end">
                <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] flex items-center justify-center active:scale-90 transition-transform">
                  <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2.2} />
                </button>
              </div>

              <div className="text-center -mt-2">
                <div className="relative inline-flex items-center justify-center">
                  <span className="text-[72px] leading-none" aria-hidden>🔥</span>
                  <span className="absolute inset-0 flex items-center justify-center pt-5 text-[30px] font-extrabold text-[var(--ink)]">{streak}</span>
                </div>
                <h2 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mt-1">{streak} day streak</h2>
                <p className="text-[14px] text-[var(--muted)] mt-1">Revise a topic each day to keep your streak going.</p>
              </div>

              <div className="mt-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
                <div className="flex justify-between">
                  {days.map((d, i) => <DayCell key={i} letter={d.letter} state={d.state} />)}
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-[var(--card-alt)] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧊</span>
                  <div>
                    <p className="text-[14px] font-bold text-[var(--ink)]">Streak freezes</p>
                    <p className="text-[12px] text-[var(--muted)]">Auto-saves your streak if you miss a day.</p>
                  </div>
                </div>
                <span className="text-[16px] font-bold text-[var(--ink)]">{freezes}<span className="text-[var(--muted)]">/{MAX_FREEZES}</span></span>
              </div>

              <button
                type="button"
                onClick={buyFreeze}
                disabled={!canBuy}
                className="mt-3 w-full py-3 rounded-2xl bg-brand-500 text-white text-[14px] font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {atMax ? 'Freezes full (2/2)' : buying ? 'Buying…' : `Buy a freeze · ${FREEZE_PRICE} 💎`}
              </button>
              {!atMax && tooPoor && (
                <p className="text-[11px] text-[var(--muted)] text-center mt-2">
                  You have {gems} 💎 — earn {FREEZE_PRICE - gems} more by revising.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
