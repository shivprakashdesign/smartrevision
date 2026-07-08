import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const UpsellContext = createContext(() => {})

// Wrap the app (below the router) to make a single shared upsell sheet available
// everywhere via useUpsell(). Call showUpsell({ title, desc }) when a locked
// feature is tapped.
export function UpsellProvider({ children }) {
  const navigate = useNavigate()
  const [content, setContent] = useState(null)
  const showUpsell = useCallback((c) => setContent(c || {}), [])

  return (
    <UpsellContext.Provider value={showUpsell}>
      {children}
      <AnimatePresence>
        {content && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setContent(null)}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-[var(--card)] rounded-t-3xl sm:rounded-3xl border border-[var(--border)] shadow-lg p-6"
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            >
              <p className="text-2xl mb-1">✨</p>
              <h3 className="text-[17px] font-bold text-[var(--ink)] tracking-tight">{content.title || 'A Pro feature'}</h3>
              <p className="text-[13px] text-[var(--muted)] mt-1 mb-5">{content.desc || 'Upgrade to SmartRevision Pro to unlock this.'}</p>
              <button
                onClick={() => { setContent(null); navigate('/pro') }}
                className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
              >
                See Pro
              </button>
              <button onClick={() => setContent(null)} className="w-full mt-2 py-2 text-[12px] font-bold text-[var(--muted)] active:opacity-70">
                Not now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UpsellContext.Provider>
  )
}

export function useUpsell() {
  return useContext(UpsellContext)
}

// Small lock chip to mark a gated control.
export function ProLock({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold text-brand-500 bg-[rgba(37,99,235,0.12)] px-1.5 py-0.5 rounded-full ${className}`}>
      🔒 Pro
    </span>
  )
}
