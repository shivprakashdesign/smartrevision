import { Link } from 'react-router-dom'
import { useTheme } from '../lib/ThemeContext'
import { THEMES } from '../lib/theme'
import AppShell from '../lib/AppShell'
import { usePro } from '../lib/ProContext'
import { useUpsell, ProLock } from '../lib/ProUpsell'
import { FREE_THEMES } from '../lib/plan'

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme()
  const { isPro } = usePro()
  const showUpsell = useUpsell()

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto">
        <Link to="/home" className="text-[12px] font-bold text-[var(--muted)]">← Back to Home</Link>
        <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight mt-2 mb-1">Theme</h1>
        <p className="text-[14px] text-[var(--muted)] mb-6">Changes apply across the whole app, instantly.</p>

        <div className="grid grid-cols-2 gap-2.5">
          {THEMES.map(t => {
            const locked = !isPro && !FREE_THEMES.includes(t.id)
            return (
              <button key={t.id}
                onClick={() => locked
                  ? showUpsell({ title: 'Every theme', desc: 'Unlock all four themes, including the dark ones, with Pro.' })
                  : setTheme(t.id)}
                className={`text-left border-2 rounded-2xl p-3 transition-colors ${
                  theme === t.id ? 'border-brand-500' : 'border-[var(--border)]'
                }`}>
                <div className={`relative h-12 rounded-xl mb-2 border border-slate-200 ${t.swatch}`}>
                  {locked && <span className="absolute inset-0 flex items-center justify-center text-lg bg-black/25 rounded-xl">🔒</span>}
                </div>
                <p className="text-[13px] font-bold text-[var(--ink)] flex items-center gap-1.5">
                  {t.name} {locked && <ProLock />}
                </p>
                <p className="text-[11px] text-[var(--muted)]">{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div></AppShell>
  )
}
