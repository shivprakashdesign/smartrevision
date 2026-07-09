import { motion, AnimatePresence } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'

const FREEZE_PRICE = 50

// Real gem-earning rules (mirror supabase_gems.sql).
const EARN = [
  { label: 'Complete a revision', pts: '+10' },
  { label: 'Finish it on time', pts: '+5' },
  { label: 'Recall it well', pts: '+5' },
  { label: '7-day streak milestone', pts: '+50' }
]

function Ring({ pct }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="rotate-[-90deg]">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--card-alt)" strokeWidth="8" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke="hsl(213,96%,56%)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))}
        style={{ transition: 'stroke-dashoffset .5s cubic-bezier(0.23,1,0.32,1)' }}
      />
    </svg>
  )
}

export default function GemsSheet({ open, onClose, student }) {
  const gems = student?.gems || 0
  const enough = gems >= FREEZE_PRICE
  const pct = enough ? 1 : gems / FREEZE_PRICE

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
              backgroundImage: 'linear-gradient(180deg, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 46%)',
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
                  <Ring pct={pct} />
                  <span className="absolute inset-0 flex items-center justify-center text-[40px] leading-none" aria-hidden>💎</span>
                </div>
                <h2 className="text-[26px] font-bold text-[var(--ink)] tracking-tight mt-1">{gems} gems</h2>
                <p className="text-[14px] text-[var(--muted)] mt-1">
                  {enough
                    ? 'Enough for a streak freeze 🧊'
                    : `${FREEZE_PRICE - gems} more for a streak freeze 🧊`}
                </p>
              </div>

              <p className="text-[13px] font-bold text-[var(--ink)] mt-6 mb-2">How to earn gems</p>
              <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] divide-y divide-[var(--border)]">
                {EARN.map(e => (
                  <div key={e.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[14px] text-[var(--slate-txt)]">{e.label}</span>
                    <span className="text-[14px] font-bold text-brand-500">{e.pts}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full py-3 rounded-2xl bg-brand-500 text-white text-[14px] font-bold active:scale-[0.98] transition-transform"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
