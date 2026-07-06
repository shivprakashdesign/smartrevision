import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const easing = [0.23, 1, 0.32, 1]
const colorTransition = 'background-color .35s cubic-bezier(0.23,1,0.32,1), border-color .35s cubic-bezier(0.23,1,0.32,1), color .35s cubic-bezier(0.23,1,0.32,1)'

const THEME_COLORS = {
  chalk:      { bg: 'hsl(264,3%,94%)',  card: 'hsl(264,100%,100%)', cardAlt: 'hsl(264,3%,90%)',  ink: 'hsl(264,6%,17%)', muted: 'hsl(264,3%,59%)', border: 'hsl(264,6%,93%)' },
  parchment:  { bg: 'hsl(20,30%,94%)',  card: 'hsl(20,30%,97%)',    cardAlt: '#ebe0db',           ink: 'hsl(20,6%,17%)',  muted: 'hsl(264,3%,59%)', border: 'hsl(20,20%,89%)' },
  slate:      { bg: 'hsl(227,6%,10%)',  card: 'hsl(225,5%,19%)',    cardAlt: 'hsl(227,5.6%,13%)', ink: 'hsl(270,3%,87%)', muted: 'hsl(227,3%,50%)', border: 'hsl(227,5%,21%)' },
  blackboard: { bg: '#090a0b',          card: 'hsl(220,10%,13%)',   cardAlt: 'hsl(220,11%,9.5%)', ink: 'hsl(270,3%,75%)', muted: 'hsl(220,3%,45%)', border: 'hsl(220,9%,14%)' }
}

const COPY = {
  student: {
    blockersQ: 'Any learning blockers?',
    blockersSub: 'Select any pain points you face — fully optional & skippable.',
    blockers: ['I cram the night before', 'Notes pile up and I never revisit them', 'I forget things right after learning them', 'Hard to stay consistent'],
    goalQ: 'What are you preparing for?',
    goals: [
      { t: 'Class 6–8', d: 'General learning, building the habit early' },
      { t: 'Class 9–10', d: 'Board exams, unit tests' },
      { t: 'Class 11–12', d: 'Board exams' },
      { t: 'JEE / NEET', d: 'Competitive exam, long prep window' },
      { t: 'Just exploring', d: 'General learning, no fixed exam' }
    ],
    subjQ: 'Which subjects are you focusing on?'
  },
  parent: {
    blockersQ: 'What is your biggest concern?',
    blockersSub: 'Select what challenges your children face — fully skippable.',
    blockers: ['They cram the night before exams', 'They forget concepts right after learning them', 'Hard to build consistent daily routines', 'Too much individual screen/phone time'],
    goalQ: 'What grade are your kids in?',
    goals: [
      { t: 'Class 6–8', d: 'Middle school, building the habit early' },
      { t: 'Class 9–10', d: 'Board exam years' },
      { t: 'Class 11–12', d: 'Higher secondary kids' },
      { t: 'JEE / NEET prep', d: 'Competitive exam planning' },
      { t: 'Just exploring', d: 'General habit tracking' }
    ],
    subjQ: 'Which subjects do they study?'
  }
}

const SUBJECTS = ['Maths', 'Science', 'Computer Sci.', 'Languages', 'History', 'Other']
const SCHEDULE = [['1', 'Same day'], ['2', 'Day 1'], ['3', 'Day 7'], ['4', 'Day 30'], ['5', 'Day 120']]
const THEMES = [
  { id: 'chalk', name: 'Chalk', desc: 'Light, bright & white', swatch: 'bg-slate-100' },
  { id: 'parchment', name: 'Parchment', desc: 'Warm, crème & milky', swatch: 'bg-orange-50' },
  { id: 'slate', name: 'Slate', desc: 'Gray, hazy & dim', swatch: 'bg-slate-700' },
  { id: 'blackboard', name: 'Blackboard', desc: 'Dark, deep & midnight', swatch: 'bg-slate-950' }
]
const STEPS = ['hook', 'curve', 'type', 'name', 'blockers', 'goal', 'schedule', 'subjects', 'theme', 'auth']
const SKIP_TARGET = { hook: 'type', curve: 'type', blockers: 'goal', subjects: 'theme' }

function TopRow({ id, onBack, muted }) {
  const isFirst = STEPS.indexOf(id) === 0
  const skipTo = SKIP_TARGET[id]
  return (
    <div className="flex items-center justify-between mb-2 min-h-[24px] flex-shrink-0">
      {!isFirst ? (
        <button onClick={onBack} style={{ color: muted, transition: colorTransition }} className="text-[12px] font-bold active:opacity-70">
          ← Back
        </button>
      ) : <span />}
      {skipTo ? (
        <button onClick={() => onBack.skip(skipTo)} style={{ color: muted, transition: colorTransition }} className="text-[12px] font-bold active:opacity-70">
          Skip
        </button>
      ) : <span />}
    </div>
  )
}

// center=true: short, fixed-length content (hook/curve/name/schedule/theme) gets
// vertically centered as ONE cohesive block, avoiding the dead-gap problem.
// center=false: variable-length content (lists, forms) stays top-anchored and
// scrolls internally within its own region if it overflows — the outer
// TopRow/footer never move, so the screen itself never scrolls as a whole.
function Screen({ children, footer, id, onBack, muted, center = true }) {
  return (
    <motion.div key={id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: easing }} className="flex flex-col h-full">
      <TopRow id={id} onBack={onBack} muted={muted} />
      <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col ${center ? 'justify-center' : 'justify-start'}`}>
        {children}
      </div>
      {footer && <div className="flex-shrink-0 pt-3">{footer}</div>}
    </motion.div>
  )
}

function Btn({ onClick, children, disabled, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-transform">
      {children}
    </button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState('hook')
  const [mode, setMode] = useState('student')
  const [name, setName] = useState('')
  const [blockers, setBlockers] = useState([])
  const [goal, setGoal] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [theme, setTheme] = useState('chalk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const [classGrade, setClassGrade] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [schoolSuggestions, setSchoolSuggestions] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const copy = COPY[mode]
  const progress = Math.round(((STEPS.indexOf(step) + 1) / STEPS.length) * 100)
  const T = THEME_COLORS[theme]

  function goBack() {
    const i = STEPS.indexOf(step)
    if (i > 0) setStep(STEPS[i - 1])
  }
  goBack.skip = (target) => setStep(target)

  function toggle(list, setList, item) {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  async function onSchoolType(v) {
    setSchool(v)
    if (v.length < 2) { setSchoolSuggestions([]); return }
    const { data } = await supabase.from('classes').select('school_name').ilike('school_name', `%${v}%`).limit(5)
    if (data) setSchoolSuggestions([...new Set(data.map(d => d.school_name))])
  }

  async function handleSignup(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setSaving(false); return }

    const { error: acctError } = await supabase.from('accounts').insert({
      id: authData.user.id,
      account_type: mode,
      name,
      theme,
      blockers,
      preparing_for: goal,
      subjects
    })
    if (acctError) { setError(acctError.message); setSaving(false); return }

    if (mode === 'student') {
      let classId = null
      if (school.trim() && classGrade.trim()) {
        const key = `${school.trim().toLowerCase().replace(/\s+/g, ' ')}|${classGrade.trim().toLowerCase().replace(/\s+/g, ' ')}`
        const { data: existing } = await supabase.from('classes').select('id').eq('normalized_key', key).maybeSingle()
        if (existing) {
          classId = existing.id
        } else {
          const { data: created } = await supabase.from('classes')
            .insert({ school_name: school.trim(), class_name: classGrade.trim(), normalized_key: key })
            .select().single()
          classId = created?.id || null
        }
      }
      await supabase.from('students').insert({
        owner_account_id: authData.user.id,
        managed_by_parent: false,
        name,
        class_grade: classGrade.trim() || null,
        class_id: classId
      })
    }

    if (referralCode.trim()) {
      const code = referralCode.trim().toUpperCase()
      const { data: referrerId } = await supabase.rpc('find_account_by_referral_code', { code })
      if (referrerId && referrerId !== authData.user.id) {
        await supabase.from('accounts').update({ referred_by_code: code }).eq('id', authData.user.id)
        await supabase.from('referral_events').insert({
          referrer_account_id: referrerId,
          referred_account_id: authData.user.id,
          reward_granted: false
        })
      }
    }

    navigate(mode === 'parent' ? '/profiles' : '/home')
  }

  const inputStyle = {
    backgroundColor: T.cardAlt,
    borderColor: T.border,
    color: T.ink,
    transition: colorTransition
  }

  return (
    <div className="font-sans flex items-center justify-center sm:px-5 sm:py-8"
      style={{ position: 'fixed', inset: 0, backgroundColor: T.bg, transition: colorTransition }}>
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[700px] sm:max-w-sm rounded-none sm:rounded-3xl border-0 sm:border shadow-none sm:shadow-sm px-6 flex flex-col overflow-hidden"
        style={{
          backgroundColor: T.card, borderColor: T.border, transition: colorTransition,
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
        }}>

        {!['hook', 'curve', 'type'].includes(step) && (
          <div className="h-1.5 rounded-full mb-3 overflow-hidden flex-shrink-0" style={{ backgroundColor: T.cardAlt, transition: colorTransition }}>
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.35, ease: easing }}
              className="h-full rounded-full bg-brand-500" />
          </div>
        )}

        <AnimatePresence mode="wait">

          {step === 'hook' && (
            <Screen id="hook" onBack={goBack} muted={T.muted} footer={<Btn onClick={() => setStep('curve')}>Continue</Btn>}>
              <div className="text-center mb-8">
                <p className="text-[76px] font-bold text-brand-500 leading-none">82%</p>
                <p style={{ color: T.muted, transition: colorTransition }} className="text-[15px] font-semibold mt-2">of what you study today<br />is gone by tomorrow</p>
              </div>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight leading-snug mb-2">You don't have a studying problem. You have a forgetting problem.</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px]">Psychologists proved the average student loses most of what they learn within just 24 hours.</p>
            </Screen>
          )}

          {step === 'curve' && (
            <Screen id="curve" onBack={goBack} muted={T.muted} footer={<Btn onClick={() => setStep('type')}>Continue</Btn>}>
              <div className="mb-6">
                <svg viewBox="0 0 320 200" width="100%">
                  <line x1="34" y1="16" x2="34" y2="168" stroke={T.border} strokeWidth="2" />
                  <line x1="34" y1="168" x2="304" y2="168" stroke={T.border} strokeWidth="2" />
                  <path d="M 36 22 Q 62 128 120 148 T 300 162" fill="none" stroke={T.muted} strokeWidth="3" strokeDasharray="5 5" opacity=".5" />
                  <motion.path d="M 36 22 Q 56 82 74 88 L 74 42 Q 106 96 136 100 L 136 54 Q 186 104 226 106 L 226 64 Q 264 102 300 104"
                    fill="none" stroke="hsl(213,96%,56%)" strokeWidth="3.5" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
                  <circle cx="74" cy="42" r="5" fill="hsl(213,96%,56%)" />
                  <circle cx="136" cy="54" r="5" fill="hsl(213,96%,56%)" />
                  <circle cx="226" cy="64" r="5" fill="hsl(213,96%,56%)" />
                  <text x="30" y="11" fontSize="10" fontWeight="700" fill={T.muted}>Memory</text>
                  <text x="262" y="184" fontSize="10" fontWeight="700" fill={T.muted}>Time →</text>
                  <text x="150" y="156" fontSize="9.5" fontWeight="600" fill={T.muted}>without revision</text>
                  <text x="148" y="46" fontSize="9.5" fontWeight="700" fill="hsl(213,96%,56%)">each revision lifts you back up</text>
                </svg>
              </div>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight leading-snug mb-2">Every revision resets the curve.</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px]">Reviewing at the right moments moves knowledge into long-term memory — so it's still there on exam day.</p>
            </Screen>
          )}

          {step === 'type' && (
            <Screen id="type" onBack={goBack} muted={T.muted} center={false}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Who's revising?</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-5">This shapes your whole experience.</p>
              <div className="space-y-2.5">
                <button onClick={() => { setMode('student'); setStep('name') }}
                  style={{ borderColor: T.border, transition: colorTransition }}
                  className="w-full text-left border-2 rounded-2xl p-4 active:border-brand-500 transition-colors">
                  <p style={{ color: T.ink, transition: colorTransition }} className="font-bold text-[14px]">🎓 I'm a student</p>
                  <p style={{ color: T.muted, transition: colorTransition }} className="text-[13px] mt-0.5">I'll add my own topics and manage my own revisions</p>
                </button>
                <button onClick={() => { setMode('parent'); setStep('name') }}
                  style={{ borderColor: T.border, transition: colorTransition }}
                  className="w-full text-left border-2 rounded-2xl p-4 active:border-brand-500 transition-colors">
                  <p style={{ color: T.ink, transition: colorTransition }} className="font-bold text-[14px]">👨‍👩‍👧 I'm a parent</p>
                  <p style={{ color: T.muted, transition: colorTransition }} className="text-[13px] mt-0.5">I'll manage revision for my children — great for Class 6–8</p>
                </button>
                <div style={{ borderColor: T.border, transition: colorTransition }} className="w-full text-left border-2 rounded-2xl p-4 opacity-55">
                  <p style={{ color: T.ink, transition: colorTransition }} className="font-bold text-[14px]">🧑‍🏫 I'm a teacher
                    <span className="text-[9px] font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full ml-2 align-middle">COMING SOON</span>
                  </p>
                  <p style={{ color: T.muted, transition: colorTransition }} className="text-[13px] mt-0.5">Push topics to your whole class and track who's revising</p>
                </div>
              </div>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-center text-[12px] mt-6">
                Already have an account? <Link to="/login" className="text-brand-500 font-bold">Log in</Link>
              </p>
            </Screen>
          )}

          {step === 'name' && (
            <Screen id="name" onBack={goBack} muted={T.muted} footer={<Btn disabled={name.trim().length < 2} onClick={() => setStep('blockers')}>Continue</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">First things first — what should we call you?</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-6">Just your first name is perfect.</p>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inputStyle}
                className="w-full text-center text-[20px] font-bold border-2 rounded-2xl px-4 py-4 focus:outline-none focus:border-brand-500 transition-colors" />
            </Screen>
          )}

          {step === 'blockers' && (
            <Screen id="blockers" onBack={goBack} muted={T.muted} center={false} footer={<Btn onClick={() => setStep('goal')}>Continue</Btn>}>
              <span className="self-start text-[12px] font-bold text-brand-500 bg-brand-50 px-3 py-1 rounded-full mb-3">Nice to meet you, {name}! 👋</span>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">{copy.blockersQ}</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">{copy.blockersSub}</p>
              <div className="space-y-2">
                {copy.blockers.map(b => {
                  const sel = blockers.includes(b)
                  return (
                    <button key={b} onClick={() => toggle(blockers, setBlockers, b)}
                      style={sel ? {} : { borderColor: T.border, color: T.ink, transition: colorTransition }}
                      className={`w-full text-left border-2 rounded-2xl p-3.5 text-[14.5px] font-bold transition-colors ${
                        sel ? 'border-brand-500 bg-brand-50 text-brand-600' : ''
                      }`}>
                      {b}
                    </button>
                  )
                })}
              </div>
            </Screen>
          )}

          {step === 'goal' && (
            <Screen id="goal" onBack={goBack} muted={T.muted} center={false} footer={<Btn disabled={!goal} onClick={() => setStep('schedule')}>Continue</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">{copy.goalQ}</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">This helps us personalise your experience.</p>
              <div className="space-y-2">
                {copy.goals.map(g => {
                  const sel = goal === g.t
                  return (
                    <button key={g.t} onClick={() => setGoal(g.t)}
                      style={sel ? {} : { borderColor: T.border, transition: colorTransition }}
                      className={`w-full text-left border-2 rounded-2xl p-3.5 transition-colors ${sel ? 'border-brand-500 bg-brand-50' : ''}`}>
                      <p style={sel ? {} : { color: T.ink, transition: colorTransition }} className={`text-[15px] font-bold ${sel ? 'text-brand-600' : ''}`}>{g.t}</p>
                      <p style={{ color: T.muted, transition: colorTransition }} className="text-[12px]">{g.d}</p>
                    </button>
                  )
                })}
              </div>
            </Screen>
          )}

          {step === 'schedule' && (
            <Screen id="schedule" onBack={goBack} muted={T.muted} footer={<Btn onClick={() => setStep('subjects')}>Looks good</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Here's your default schedule</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">Based on proven memory research — the 5-review cycle that moves knowledge into long-term memory.</p>
              <div className="border-2 rounded-2xl p-4" style={{ borderColor: 'hsla(213,96%,56%,.33)' }}>
                <p className="text-[10px] font-bold tracking-widest text-brand-500 mb-3">STANDARD SCIENTIFIC SCHEDULE</p>
                {SCHEDULE.map(([n, when], i) => (
                  <motion.div key={n} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.25, ease: easing }}
                    className="flex items-center mb-2.5 last:mb-0">
                    <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 text-[12px] font-bold flex items-center justify-center mr-3">{n}</span>
                    <span style={{ color: T.ink, transition: colorTransition }} className="text-[14.5px] font-bold">{when}</span>
                  </motion.div>
                ))}
                <p style={{ color: T.muted, transition: colorTransition }} className="text-[12px] mt-3">You can switch any topic to a custom schedule later.</p>
              </div>
            </Screen>
          )}

          {step === 'subjects' && (
            <Screen id="subjects" onBack={goBack} muted={T.muted} center={false} footer={<Btn onClick={() => setStep('theme')}>Continue</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">{copy.subjQ}</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">Pick a few to start — you can add more anytime.</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(s => {
                  const sel = subjects.includes(s)
                  return (
                    <button key={s} onClick={() => toggle(subjects, setSubjects, s)}
                      style={sel ? {} : { borderColor: T.border, color: T.ink, transition: colorTransition }}
                      className={`px-4 py-2.5 rounded-full text-[14.5px] font-bold border-2 transition-colors ${
                        sel ? 'bg-brand-500 border-brand-500 text-white' : ''
                      }`}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </Screen>
          )}

          {step === 'theme' && (
            <Screen id="theme" onBack={goBack} muted={T.muted} footer={<Btn onClick={() => setStep('auth')}>Continue</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Choose your theme</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">Pick a design that fits your study mood — the card behind this quiz updates live.</p>
              <div className="grid grid-cols-2 gap-2.5">
                {THEMES.map(t => {
                  const sel = theme === t.id
                  return (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      style={sel ? {} : { borderColor: T.border, transition: colorTransition }}
                      className={`text-left border-2 rounded-2xl p-3 transition-colors ${sel ? 'border-brand-500' : ''}`}>
                      <div className={`h-12 rounded-xl mb-2 border border-slate-200 ${t.swatch}`} />
                      <p style={{ color: T.ink, transition: colorTransition }} className="text-[14.5px] font-bold">{t.name}</p>
                      <p style={{ color: T.muted, transition: colorTransition }} className="text-[11.5px]">{t.desc}</p>
                    </button>
                  )
                })}
              </div>
            </Screen>
          )}

          {step === 'auth' && (
            <Screen id="auth" onBack={goBack} muted={T.muted} center={false}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Almost there, {name}!</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">
                {mode === 'student' ? 'Your school & class connect you to your class leaderboard.' : "Create your account — you'll add your child right after."}
              </p>
              <form onSubmit={handleSignup} className="space-y-2.5">
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle}
                  className="w-full border rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle}
                  className="w-full border rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                {mode === 'student' && (
                  <>
                    <input placeholder="School name" value={school} onChange={e => onSchoolType(e.target.value)} list="school-suggestions" style={inputStyle}
                      className="w-full border rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                    <datalist id="school-suggestions">
                      {schoolSuggestions.map(s => <option key={s} value={s} />)}
                    </datalist>
                    <input placeholder="Class (e.g. Class 11)" value={classGrade} onChange={e => setClassGrade(e.target.value)} style={inputStyle}
                      className="w-full border rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                  </>
                )}
                <input placeholder="Referral code (optional)" value={referralCode} onChange={e => setReferralCode(e.target.value)} style={inputStyle}
                  className="w-full border rounded-2xl px-4 py-3 text-[15px] uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                {error && <p className="text-red-500 text-[12px]">{error}</p>}
                <Btn type="submit" disabled={saving}>{saving ? 'Creating account...' : 'Start revising'}</Btn>
              </form>
            </Screen>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
