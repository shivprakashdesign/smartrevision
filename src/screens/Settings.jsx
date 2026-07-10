import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { Fire02Icon, Diamond02Icon, ArrowRight01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import NumberFlow from '@number-flow/react'
import AppShell from '../lib/AppShell'
import { useAuth } from '../lib/AuthContext'
import { usePro } from '../lib/ProContext'
import { useTheme } from '../lib/ThemeContext'
import { THEMES } from '../lib/theme'
import { useStudentProfile } from '../lib/useStudentProfile'

function initials(name) {
  if (!name) return 'SR'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

// One tappable settings row: tinted emoji tile · label · optional value · chevron.
function Row({ to, onClick, tile, tint, label, value, danger, last }) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 active:bg-[var(--card-alt)] transition-colors ${last ? '' : 'border-b border-[var(--border)]'}`}>
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[15px] shrink-0 ${tint}`} aria-hidden>{tile}</span>
      <span className={`text-[15px] font-bold flex-1 ${danger ? 'text-red-500' : 'text-[var(--ink)]'}`}>{label}</span>
      {value && <span className="text-[13px] text-[var(--muted)] font-semibold">{value}</span>}
      {!danger && <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2.2} className="text-[var(--slate-txt)] opacity-50" />}
    </div>
  )
  if (to) return <Link to={to}>{inner}</Link>
  return <button type="button" onClick={onClick} className="w-full text-left">{inner}</button>
}

function Group({ title, delay, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
      className="mb-5"
    >
      {title && <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--slate-txt)] px-1.5 mb-2">{title}</p>}
      <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm">
        {children}
      </div>
    </motion.div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()
  const { isPro } = usePro()
  const { theme } = useTheme()
  const { student, allStudents, accountType } = useStudentProfile()
  const navigate = useNavigate()

  const themeName = THEMES.find(t => t.id === theme)?.name || 'Chalk'
  // Parents manage children from /profiles regardless of count (even zero, to add one).
  // Non-parent accounts only see it if they somehow hold multiple profiles.
  const isParent = accountType === 'parent'
  const showSwitch = isParent || (allStudents?.length || 0) > 1

  return (
    <AppShell><div className="px-5 pt-6 pb-10">
      <div className="max-w-sm mx-auto">

        <Link to="/home" className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--muted)] active:opacity-70 transition-opacity mb-4">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} /> Home
        </Link>

        {/* Profile hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm p-5 mb-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-500 text-white text-[22px] font-bold flex items-center justify-center shrink-0">
              {initials(student?.name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight leading-tight truncate">
                {student?.name || 'Your profile'}
              </h1>
              {student?.class_grade && (
                <p className="text-[13px] font-semibold text-[var(--muted)]">Class {student.class_grade}</p>
              )}
              <p className="text-[12px] text-[var(--slate-txt)] truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[var(--card-alt)]">
              <HugeiconsIcon icon={Fire02Icon} size={18} strokeWidth={1.5} color="#f59e0b" className="[&_path]:fill-[#f59e0b]" />
              <span className="text-[15px] font-bold text-[var(--ink)]"><NumberFlow value={student?.current_streak || 0} /></span>
              <span className="text-[12px] text-[var(--muted)] font-semibold">day streak</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-[var(--card-alt)]">
              <HugeiconsIcon icon={Diamond02Icon} size={18} strokeWidth={1.5} className="[&_path]:fill-[hsl(213,96%,56%)]" />
              <span className="text-[15px] font-bold text-[var(--ink)]"><NumberFlow value={student?.gems || 0} /></span>
              <span className="text-[12px] text-[var(--muted)] font-semibold">gems</span>
            </div>
          </div>
        </motion.div>

        {/* Plan */}
        <motion.button
          type="button"
          onClick={() => navigate('/pro')}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="w-full text-left mb-5 rounded-3xl p-5 active:scale-[0.99] transition-transform overflow-hidden relative"
          style={{ background: isPro
            ? 'linear-gradient(135deg, hsl(213,96%,56%), hsl(263,80%,60%))'
            : 'linear-gradient(135deg, #1e293b, #0f172a)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">{isPro ? 'Your plan' : 'Upgrade'}</p>
              <p className="text-[19px] font-bold text-white mt-0.5">{isPro ? 'Smart Revision Pro ✦' : 'Go Pro'}</p>
              <p className="text-[12.5px] text-white/70 mt-0.5">{isPro ? 'All themes & features unlocked' : 'Unlock every theme, insight & more'}</p>
            </div>
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2.2} className="text-white/80 shrink-0" />
          </div>
        </motion.button>

        {/* Preferences */}
        <Group title="Preferences" delay={0.1}>
          <Row to="/settings/study-plan" tile="🎯" tint="bg-brand-500/15" label="Study plan" value={student?.class_grade ? `Class ${student.class_grade}` : 'Set up'} />
          <Row to="/settings/theme" tile="🎨" tint="bg-violet-500/15" label="Theme" value={themeName} />
          <Row to="/settings/subjects" tile="🗂️" tint="bg-teal-500/15" label="Subjects" />
          <Row to="/settings/notifications" tile="🔔" tint="bg-amber-500/15" label="Notifications" last />
        </Group>

        {/* More */}
        <Group title="More" delay={0.15}>
          <Row to="/learn" tile="📖" tint="bg-emerald-500/15" label="Learn" />
          <Row to="/referral" tile="🎁" tint="bg-pink-500/15" label="Refer a friend" last={!showSwitch} />
          {showSwitch && <Row to="/profiles" tile="👨‍👩‍👧" tint="bg-brand-500/15" label={isParent ? 'Manage children' : 'Switch child'} last />}
        </Group>

        {/* Account */}
        <Group delay={0.2}>
          <Row onClick={logout} tile="↩︎" tint="bg-red-500/15" label="Log out" danger last />
        </Group>

        <p className="text-center text-[11px] text-[var(--slate-txt)] mt-2">Smart Revision · v1.0</p>
      </div>
    </div></AppShell>
  )
}
