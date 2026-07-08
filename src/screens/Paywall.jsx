import AppShell from '../lib/AppShell'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { usePro } from '../lib/ProContext'
import { PRO_FEATURES } from '../lib/plan'

export default function Paywall() {
  const navigate = useNavigate()
  const { isPro } = usePro()

  function handleUpgrade() {
    // Payments aren't wired yet — entitlement is granted server-side (webhook /
    // SQL). This is the hook point for Stripe / RevenueCat later.
    toast('Payments are coming soon — you\'ll be able to upgrade here.')
  }

  return (
    <AppShell><div className="px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-sm space-y-3">
        <Link to="/home" className="text-[12px] font-bold text-[var(--muted)]">← Back to Home</Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-6"
        >
          <div className="text-center mb-5">
            <p className="text-3xl mb-1">✨</p>
            <h1 className="text-[22px] font-bold text-[var(--ink)] tracking-tight">SmartRevision Pro</h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">Get the most out of every study session.</p>
          </div>

          <div className="space-y-3 mb-6">
            {PRO_FEATURES.map(f => (
              <div key={f.title} className="flex gap-3">
                <span className="text-xl leading-none">{f.icon}</span>
                <div>
                  <p className="text-[14px] font-bold text-[var(--ink)]">{f.title}</p>
                  <p className="text-[12px] text-[var(--muted)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {isPro ? (
            <div className="w-full py-3 rounded-2xl bg-[rgba(37,99,235,0.12)] text-brand-500 font-bold text-[14px] text-center">
              You're on Pro ✓
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
            >
              Upgrade to Pro
            </button>
          )}
          <button onClick={() => navigate(-1)} className="w-full mt-2 py-2 text-[12px] font-bold text-[var(--muted)] active:opacity-70">
            Maybe later
          </button>
        </motion.div>
      </div>
    </div></AppShell>
  )
}
