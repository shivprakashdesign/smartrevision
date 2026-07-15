// The Memory Forecast detail sheet, opened from the Home forecast card.
// Answers three questions in student language: where am I headed on exam day,
// what happens if I stop, and what should I revise first. Same bottom-sheet
// pattern as StreakSheet, brand-blue tint instead of amber.
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { forecastCard, forecastBySubject, weakestTopics } from './forecast'
import { subjectColor } from './subjects'

const shortDate = iso => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

// Same 67/40 bands as the rest of the app: green = holding, amber = fading,
// red = revise me.
const toneText = m => (m >= 67 ? 'text-emerald-600' : m >= 40 ? 'text-amber-600' : 'text-red-500')
const toneBar = m => (m >= 67 ? 'bg-emerald-500' : m >= 40 ? 'bg-amber-500' : 'bg-red-500')

function Bar({ value }) {
  return (
    <div className="flex-1 h-1.5 rounded-full bg-[var(--card-alt)] overflow-hidden">
      <div className={`h-full rounded-full ${toneBar(value)}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

export default function ForecastSheet({ open, onClose, topics, examDate }) {
  const card = forecastCard(topics, examDate)
  if (card.state !== 'ready') return null

  const subjects = forecastBySubject(topics, examDate).filter(s => s.planned != null)
  const weakest = weakestTopics(topics, examDate, 3)
  const capped = card.planned > 90
  const shownPct = `${Math.min(card.planned, 90)}%${capped ? '+' : ''}`
  const when = card.daysLeft === 0 ? 'Exam today' : card.daysLeft === 1 ? 'Exam tomorrow' : `Exam in ${card.daysLeft} days`

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
              backgroundImage: 'linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 46%)',
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
                <span className="text-[56px] leading-none" aria-hidden>🧠</span>
                <h2 className={`text-[34px] font-bold tracking-tight mt-1 ${toneText(card.planned)}`}>~{shownPct}</h2>
                <p className="text-[14px] text-[var(--muted)] mt-0.5">is how much you'll remember on exam day</p>
                <p className="text-[12px] font-bold text-[var(--slate-txt)] mt-1">{when} · {shortDate(examDate)}</p>
              </div>

              {/* Keep going vs stop */}
              <div className="mt-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-[var(--slate-txt)] w-24 shrink-0">Keep revising</span>
                  <Bar value={card.planned} />
                  <span className={`text-[12px] font-bold w-10 text-right ${toneText(card.planned)}`}>~{shownPct}</span>
                </div>
                {card.ifStopped != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-bold text-[var(--slate-txt)] w-24 shrink-0">If you stop</span>
                    <Bar value={card.ifStopped} />
                    <span className="text-[12px] font-bold w-10 text-right text-[var(--muted)]">~{card.ifStopped}%</span>
                  </div>
                )}
              </div>

              {/* Per-subject, weakest first */}
              {subjects.length > 1 && (
                <div className="mt-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-3">By subject</p>
                  <div className="space-y-2.5">
                    {subjects.map(s => (
                      <div key={s.subject} className="flex items-center gap-3">
                        <span className="text-[12px] font-bold w-24 truncate shrink-0" style={{ color: subjectColor(s.subject) }}>{s.subject}</span>
                        <Bar value={s.planned} />
                        <span className={`text-[12px] font-bold w-10 text-right ${toneText(s.planned)}`}>{s.planned}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Triage list */}
              {weakest.length > 0 && (
                <div className="mt-3 rounded-2xl bg-[var(--card-alt)] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Revise these first</p>
                  {weakest.map(t => (
                    <Link key={t.id} to={`/topic/${t.id}`} className="flex items-center gap-2 py-2 active:opacity-70">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold text-[var(--ink)] truncate">{t.name}</p>
                        <p className="text-[11px] text-[var(--muted)]">{t.subject}</p>
                      </div>
                      <span className={`text-[12px] font-bold ${toneText(t.planned)}`}>{t.planned}%</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} className="text-[var(--muted)] shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {card.unrevised > 0 && (
                <p className="text-[12px] text-[var(--muted)] text-center mt-3">
                  {card.unrevised === 1 ? "1 topic hasn't" : `${card.unrevised} topics haven't`} been revised yet.
                </p>
              )}
              <p className="text-[11px] text-[var(--muted)] text-center mt-2">
                This is our best guess from your revisions so far.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
