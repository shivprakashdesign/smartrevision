import { useEffect, useState } from 'react'
import AppShell from '../lib/AppShell'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import NumberFlow from '@number-flow/react'
import { supabase } from '../lib/supabase'
import { sessionResult } from '../engine/forecast'

const todayISO = () => new Date().toISOString().slice(0, 10)
const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// Ticks from the pre-session memory% to 100 shortly after mount — the visible
// "recharge" that makes the session feel like it did something.
function MemoryTick({ from, to }) {
  const [value, setValue] = useState(from)
  useEffect(() => {
    const t = setTimeout(() => setValue(to), 650)
    return () => clearTimeout(t)
  }, [to])
  return <NumberFlow value={value} />
}

// The post-session reward screen. After a struggled rep it leads with the
// rescue review, not the (deliberately low, lapse-semantics) forecast number —
// that triage signal belongs on the Home card, not in this vulnerable moment.
// Exported so the harness can render it without an authenticated session.
export function SessionResult({ subject, topicName, result, onDone }) {
  const showForecast = result.forecast != null && !result.extraDate
  return (
    <div className="text-center">
      <p className="text-[12px] text-[var(--muted)] mb-1">{subject}</p>
      <h1 className="text-[18px] font-bold text-[var(--ink)] tracking-tight mb-6">{topicName}</h1>

      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Memory recharged</p>
      <p className="text-[44px] font-bold tracking-tight leading-none text-emerald-600">
        <MemoryTick from={result.memBefore ?? 0} to={result.memAfter} />%
      </p>
      <p className="text-[12px] text-[var(--muted)] mt-1.5 mb-5">
        {result.memBefore == null
          ? 'First revision done — great start!'
          : `It was down to ${result.memBefore}% — good thing you revised.`}
      </p>

      {showForecast && (
        <p className="text-[13px] text-[var(--slate-txt)] bg-[var(--card-alt)] rounded-2xl px-4 py-3 mb-2">
          You'll remember about <b className="text-[var(--ink)]">{result.forecast}%</b> of this on exam day.
        </p>
      )}
      {result.extraDate && (
        <p className="text-[13px] text-[var(--slate-txt)] bg-[var(--card-alt)] rounded-2xl px-4 py-3 mb-2">
          Tough one — we added an <b className="text-[var(--ink)]">extra review on {longDate(result.extraDate)}</b> so it sticks. 💪
        </p>
      )}

      <button
        onClick={onDone}
        className="w-full mt-3 py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
      >
        Done
      </button>
    </div>
  )
}

export default function RevisionSession() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [revision, setRevision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('confirm')
  const [timeSpent, setTimeSpent] = useState(null)
  const [customTime, setCustomTime] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    loadRevision()
  }, [id])

  async function loadRevision() {
    // Sibling revisions + exam date ride along so the result screen can show
    // the memory recharge and exam-day forecast without extra round-trips.
    const { data } = await supabase
      .from('revisions')
      .select('*, topics(id, topic_name, subject, student_id, students(exam_date), revisions(id, scheduled_date, interval_label, completed, completed_at, recall_quality))')
      .eq('id', id)
      .single()
    setRevision(data)
    setLoading(false)
  }

  async function handleQualitySelect(quality) {
    setStep('saving')
    const minutes = timeSpent === 'custom' ? parseInt(customTime) || 0 : timeSpent

    await supabase
      .from('revisions')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        time_spent_minutes: minutes,
        recall_quality: quality
      })
      .eq('id', id)

    const studentId = revision.topics.student_id
    // Streak + freeze handling lives server-side in the record_activity RPC.
    const { data: activity } = await supabase.rpc('record_activity', { p_student_id: studentId })

    const { data: myAccount } = await supabase
      .from('accounts')
      .select('id, referred_by_code')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (myAccount?.referred_by_code) {
      const { count } = await supabase
        .from('revisions')
        .select('*', { count: 'exact', head: true })
        .eq('completed', true)

      if (count === 1) {
        const { data: referrerId } = await supabase
          .rpc('find_account_by_referral_code', { code: myAccount.referred_by_code })

        if (referrerId) {
          await supabase
            .from('referral_events')
            .update({ reward_granted: true })
            .eq('referrer_account_id', referrerId)
            .eq('referred_account_id', myAccount.id)
        }
      }
    }

    let extraDate = null
    if (quality === 'struggled') {
      const { data: nextRevision } = await supabase
        .from('revisions')
        .select('scheduled_date')
        .eq('topic_id', revision.topics.id)
        .eq('completed', false)
        .gt('scheduled_date', revision.scheduled_date)
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (nextRevision) {
        const todayDate = new Date()
        const nextDate = new Date(nextRevision.scheduled_date)
        const gapDays = Math.floor((nextDate - todayDate) / (1000 * 60 * 60 * 24))

        if (gapDays > 1) {
          let extraOffset = Math.floor(gapDays / 2)
          extraOffset = Math.max(1, Math.min(14, extraOffset))
          const extra = new Date(todayDate)
          extra.setDate(extra.getDate() + extraOffset)
          extraDate = extra.toISOString().slice(0, 10)

          await supabase.from('revisions').insert({
            topic_id: revision.topics.id,
            scheduled_date: extraDate,
            interval_label: 'extra'
          })
        }
      }
    }

    if (activity?.froze) {
      toast.success(`Welcome back! A streak freeze saved your ${activity.streak}-day streak 🧊`)
    } else if (activity?.milestone) {
      toast.success(`${activity.streak}-day streak! +50 💎`)
    } else if (activity?.streak) {
      toast.success(`Revision logged · streak ${activity.streak} 🔥`)
    } else {
      toast.success('Revision logged 🎉')
    }

    // The reward moment: memory recharge + exam-day forecast, computed locally
    // from the sibling rows we already fetched (plus the extra review, if any).
    // If the sibling rows didn't come back, skip the moment rather than show
    // a broken one — the old straight-to-home flow is the fallback.
    const res = sessionResult(
      revision.topics.revisions || [],
      revision.id,
      quality,
      revision.topics.students?.exam_date || null,
      extraDate
    )
    if (res.memAfter == null) {
      navigate('/home')
      return
    }
    setResult({ ...res, extraDate })
    setStep('done')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading...</div>
  if (!revision) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Revision not found</div>

  // Guard the flow itself, not just the entry buttons: a future-dated revision
  // stays locked (revising early defeats the spacing interval), and a completed
  // one can't be re-done for extra gems.
  const isLocked = !revision.completed && revision.scheduled_date > todayISO()
  if (revision.completed || isLocked) {
    return (
      <AppShell><div className="px-6 flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="w-full max-w-sm bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-6 text-center">
          <p className="text-3xl mb-3">{isLocked ? '🔒' : '✅'}</p>
          <p className="text-[12px] text-[var(--muted)] mb-1">{revision.topics.subject}</p>
          <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight mb-3">{revision.topics.topic_name}</h1>
          <p className="text-[14px] text-[var(--slate-txt)] mb-6">
            {isLocked
              ? <>This revision unlocks on <b className="text-[var(--ink)]">{longDate(revision.scheduled_date)}</b>. The gap is what makes it stick — see you then!</>
              : 'This revision is already done — nothing more to log here.'}
          </p>
          <button
            onClick={() => navigate(`/topic/${revision.topics.id}`)}
            className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
          >
            Back to topic
          </button>
        </div>
      </div></AppShell>
    )
  }

  const easing = [0.23, 1, 0.32, 1]

  return (
    <AppShell><div className="px-6 flex items-center justify-center" style={{ minHeight: '100dvh' }}>
      <div className="w-full max-w-sm bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-6 overflow-hidden">
        <AnimatePresence mode="wait">

          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: easing }}>
              <p className="text-[12px] text-[var(--muted)] mb-1">{revision.topics.subject}</p>
              <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight mb-6">{revision.topics.topic_name}</h1>
              <p className="text-[14px] text-[var(--slate-txt)] mb-6">Go revise this from your notes, textbook, or memory — then come back and mark it done.</p>
              <button
                onClick={() => setStep('time')}
                className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
              >
                I've revised this ✓
              </button>
            </motion.div>
          )}

          {step === 'time' && (
            <motion.div key="time" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: easing }}>
              <h1 className="text-[17px] font-bold text-[var(--ink)] tracking-tight mb-4">How long did you spend?</h1>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[5, 10, 20].map(m => (
                  <button
                    key={m}
                    onClick={() => { setTimeSpent(m); setStep('quality') }}
                    className="py-3 rounded-2xl border-2 border-[var(--border)] text-[14px] font-bold text-[var(--slate-txt)] active:scale-[0.97] transition-transform"
                  >
                    {m} min
                  </button>
                ))}
                <button
                  onClick={() => setTimeSpent('custom')}
                  className={`py-3 rounded-2xl border-2 text-[14px] font-bold transition-colors ${timeSpent === 'custom' ? 'border-brand-500 text-brand-600' : 'border-[var(--border)] text-[var(--slate-txt)]'}`}
                >
                  Custom
                </button>
              </div>
              {timeSpent === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Minutes"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="flex-1 border border-[var(--border)] rounded-2xl px-3 py-2 text-[14px] bg-[var(--card-alt)]"
                  />
                  <button
                    onClick={() => setStep('quality')}
                    className="px-4 py-2 rounded-2xl bg-brand-500 text-white text-[14px] font-bold active:scale-[0.97] transition-transform"
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'quality' && (
            <motion.div key="quality" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: easing }}>
              <h1 className="text-[17px] font-bold text-[var(--ink)] tracking-tight mb-4">How well did you remember?</h1>
              <div className="space-y-2">
                <button
                  onClick={() => handleQualitySelect('good')}
                  className="w-full py-3 rounded-2xl border-2 border-[var(--border)] text-[var(--ink)] text-[14px] font-bold text-left px-4 active:scale-[0.97] transition-transform"
                >
                  😊 Remembered well
                </button>
                <button
                  onClick={() => handleQualitySelect('okay')}
                  className="w-full py-3 rounded-2xl border-2 border-[var(--border)] text-[var(--ink)] text-[14px] font-bold text-left px-4 active:scale-[0.97] transition-transform"
                >
                  😐 It was okay
                </button>
                <button
                  onClick={() => handleQualitySelect('struggled')}
                  className="w-full py-3 rounded-2xl border-2 border-[var(--border)] text-[var(--ink)] text-[14px] font-bold text-left px-4 active:scale-[0.97] transition-transform"
                >
                  😓 I struggled remembering
                </button>
              </div>
            </motion.div>
          )}

          {step === 'saving' && (
            <motion.p key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[14px] text-[var(--muted)] text-center py-8">
              Saving...
            </motion.p>
          )}

          {step === 'done' && result && (
            <motion.div key="done" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, ease: easing }}>
              <SessionResult
                subject={revision.topics.subject}
                topicName={revision.topics.topic_name}
                result={result}
                onDone={() => navigate('/home')}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div></AppShell>
  )
}
