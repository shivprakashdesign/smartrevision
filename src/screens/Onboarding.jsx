import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import NumberFlow from '@number-flow/react'
import { supabase } from '../lib/supabase'
import { subjectColor, subjectsForGoal } from '../lib/subjects'
import { useSchoolSearch, createSchool, findOrCreateClass, schoolSubtitle } from '../lib/schools'
import { STANDARD_OFFSETS, offsetsFor, offsetLabel, daysUntilExam } from '../lib/schedule'
import { useTheme } from '../lib/ThemeContext'
import { usePro } from '../lib/ProContext'
import { useUpsell, ProLock } from '../lib/ProUpsell'
import { FREE_THEMES } from '../lib/plan'

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

const todayISO = () => new Date().toLocaleDateString('en-CA')

// ISO day-of-week, matching `students.study_days` and Postgres' isodow.
const STUDY_DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']]

// "Sun", "Sat and Sun", "Fri, Sat and Sun"
const listAnd = (xs) =>
  xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

const THEMES = [
  { id: 'chalk', name: 'Chalk', desc: 'Light, bright & white', swatch: 'bg-slate-100' },
  { id: 'parchment', name: 'Parchment', desc: 'Warm, crème & milky', swatch: 'bg-orange-50' },
  { id: 'slate', name: 'Slate', desc: 'Gray, hazy & dim', swatch: 'bg-slate-700' },
  { id: 'blackboard', name: 'Blackboard', desc: 'Dark, deep & midnight', swatch: 'bg-slate-950' }
]
// Grades a student can pick, highest first — most of our users are in the
// exam years, and a horizontal list should open on them rather than on Class 1.
const GRADES = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

// `school` is student-only: a parent's children each have their own school, so
// asking once here would be wrong. See `stepsFor`.
//
// `theme` and `summary` sit *after* `auth`. A pre-auth funnel is the most
// expensive real estate in the app, and neither one has to be there: theme is
// editable in Settings and half of it is Pro-locked, and a recap only means
// something once there's an account to recap.
const STEPS = ['hook', 'curve', 'type', 'name', 'blockers', 'goal', 'school', 'schedule', 'subjects', 'auth', 'theme', 'summary']
const SKIP_TARGET = { hook: 'type', curve: 'type', blockers: 'goal', school: 'schedule', subjects: 'auth', theme: 'summary' }

// The account already exists by the time these render — going back would
// re-submit the signup form against an email that is now taken.
const NO_BACK = ['hook', 'theme', 'summary']

const stepsFor = (mode) => STEPS.filter(s => s !== 'school' || mode === 'student')

function TopRow({ id, onBack, muted }) {
  const isFirst = NO_BACK.includes(id)
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
function Screen({ children, footer, id, onBack, muted, center = true, overlay = null }) {
  return (
    <motion.div key={id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.22, ease: easing }} className="relative flex flex-col h-full">
      {overlay}
      <TopRow id={id} onBack={onBack} muted={muted} />
      <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col ${center ? 'justify-center' : 'justify-start'}`}>
        {children}
      </div>
      {footer && <div className="flex-shrink-0 pt-3">{footer}</div>}
    </motion.div>
  )
}

// Decorative emoji that softly fades in (with a stagger) and then bobs forever.
// The fade lives on the outer span (opacity) and the bob on the inner (transform)
// so the two animations never fight. aria-hidden + pointer-events-none keep it
// purely cosmetic.
function FloatingEmoji({ children, className = '', delay = 0, dur = 3, phase = 0 }) {
  return (
    <span aria-hidden="true" style={{ animationDelay: `${delay}s` }}
      className={`fade-soft pointer-events-none absolute select-none ${className}`}>
      <span className="emoji-bob inline-block will-change-transform" style={{ animationDuration: `${dur}s`, animationDelay: `${phase}s` }}>
        {children}
      </span>
    </span>
  )
}

function Btn({ onClick, children, disabled, type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[15px] disabled:opacity-40 active:scale-[0.97] transition-transform">
      {children}
    </button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  // The theme step runs after signup, so these are all meaningful by then.
  const { setTheme: persistTheme } = useTheme()
  const { isPro } = usePro()
  const showUpsell = useUpsell()
  const [step, setStep] = useState('hook')
  const [mode, setMode] = useState('student')
  const [name, setName] = useState('')
  const [blockers, setBlockers] = useState([])
  const [goal, setGoal] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [customSubjects, setCustomSubjects] = useState([])
  const [customDraft, setCustomDraft] = useState(null)
  const [theme, setTheme] = useState('chalk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [grade, setGrade] = useState(null)
  const [examDate, setExamDate] = useState('')
  const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5, 6])
  const [school, setSchool] = useState(null)      // the chosen row, or null
  const [schoolQuery, setSchoolQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [hookPct, setHookPct] = useState(0)
  const [hookReveal, setHookReveal] = useState(0)

  // Staged reveal of the opening screen: count the "82%" up first, and only
  // once it has finished loading bring in the heading, then the paragraph.
  useEffect(() => {
    const startCount = setTimeout(() => setHookPct(82), 400)
    const showHeading = setTimeout(() => setHookReveal(1), 1700)
    const showParagraph = setTimeout(() => setHookReveal(2), 2600)
    return () => { clearTimeout(startCount); clearTimeout(showHeading); clearTimeout(showParagraph) }
  }, [])

  // Same staged, soft reveal on the forgetting-curve screen: the chart draws
  // itself first, then the heading fades in, then the paragraph.
  const [curveReveal, setCurveReveal] = useState(0)
  useEffect(() => {
    if (step !== 'curve') { setCurveReveal(0); return }
    const showHeading = setTimeout(() => setCurveReveal(1), 1600)
    const showParagraph = setTimeout(() => setCurveReveal(2), 2500)
    return () => { clearTimeout(showHeading); clearTimeout(showParagraph) }
  }, [step])

  // Going Back and picking a different goal swaps the offered subjects, so drop
  // any selection that no longer has a chip. Custom subjects always survive.
  useEffect(() => {
    const offered = [...subjectsForGoal(goal), ...customSubjects]
    setSubjects(prev => prev.filter(s => offered.includes(s)))
  }, [goal])

  const { results: schoolResults, searching } = useSchoolSearch(schoolQuery, grade, step === 'school' && !school)

  // The preview shows the schedule a topic added today would actually get, so
  // picking an exam date visibly removes the reviews that fall after it.
  const plannedOffsets = offsetsFor(examDate || null)
  const dropped = STANDARD_OFFSETS.length - plannedOffsets.length
  const daysLeft = daysUntilExam(examDate || null)
  const whenExam = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`

  // Name the rest days back to the student — the promise is the whole point of
  // asking, and it's easier to trust when it's spelled out.
  const restDays = STUDY_DAYS.filter(([d]) => !studyDays.includes(d)).map(([, l]) => l)
  const restDayNote = restDays.length === 0
    ? 'Studying every day — any day you miss will break your streak.'
    : `${listAnd(restDays)} ${restDays.length === 1 ? 'is a rest day' : 'are rest days'} — missing ${restDays.length === 1 ? 'it' : 'them'} won't break your streak.`

  // The recap only shows what was actually answered — a skipped school or a
  // blank exam date leaves no row, rather than a row reading "None".
  const summaryRows = mode === 'parent'
    ? [['NEXT UP', "Add your child's profile"]]
    : [
        grade && school && ['CLASS & SCHOOL', `Class ${grade} · ${school.name}`],
        grade && !school && ['CLASS', `Class ${grade}`],
        examDate && ['EXAM', `${whenExam.replace(/^in /, 'In ')} · ${plannedOffsets.length} reviews per topic`],
        ['STUDY DAYS', restDays.length ? STUDY_DAYS.filter(([d]) => studyDays.includes(d)).map(([, l]) => l).join(', ') : 'Every day']
      ].filter(Boolean)

  const copy = COPY[mode]
  const steps = stepsFor(mode)
  const progress = Math.round(((steps.indexOf(step) + 1) / steps.length) * 100)
  const T = THEME_COLORS[theme]

  // On mobile the onboarding card is full-bleed and should read as the whole
  // screen. Match the html/body background to the card so any area outside the
  // 100dvh box in an iOS standalone PWA (e.g. behind the home indicator) blends
  // in instead of showing a grey strip. Restored on unmount / theme change.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.backgroundColor
    const prevBody = body.style.backgroundColor
    html.style.backgroundColor = T.card
    body.style.backgroundColor = T.card
    return () => {
      html.style.backgroundColor = prevHtml
      body.style.backgroundColor = prevBody
    }
  }, [T.card])

  // Navigate through the mode-filtered list, so a parent never lands on (or
  // reverses into) the student-only school step.
  const next = (from) => steps[Math.min(steps.length - 1, steps.indexOf(from) + 1)]

  function goBack() {
    const i = steps.indexOf(step)
    if (i > 0) setStep(steps[i - 1])
  }
  goBack.skip = (target) => setStep(target)

  function toggle(list, setList, item) {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  // Never let the last study day be turned off: an empty set would make every
  // gap zero-length and the streak unbreakable. The migration fails closed the
  // same way, but the UI shouldn't invite it.
  function toggleStudyDay(d) {
    if (studyDays.includes(d)) {
      if (studyDays.length === 1) return
      setStudyDays(studyDays.filter(x => x !== d))
    } else {
      setStudyDays([...studyDays, d].sort((a, b) => a - b))
    }
  }

  // A custom subject is added already-selected — nobody types a subject name
  // they don't study. Duplicates just select the existing chip.
  function addCustomSubject() {
    const name = (customDraft || '').trim()
    setCustomDraft(null)
    if (!name) return
    const offered = [...subjectsForGoal(goal), ...customSubjects]
    const match = offered.find(s => s.toLowerCase() === name.toLowerCase())
    if (match) {
      if (!subjects.includes(match)) setSubjects([...subjects, match])
      return
    }
    setCustomSubjects([...customSubjects, name])
    setSubjects([...subjects, name])
  }

  // Paint the card immediately, and persist through ThemeContext — it already
  // read accounts.theme when the session appeared, so a bare update here would
  // be overwritten by its stale copy the moment we land on Home.
  function pickTheme(id, locked) {
    if (locked) {
      showUpsell({ title: 'Every theme', desc: 'Unlock all four themes, including the dark ones, with Pro.' })
      return
    }
    setTheme(id)
    persistTheme(id)
  }

  // "Can't find your school" — hold the name, don't write it. The insert policy
  // on `schools` requires auth.uid(), and this step runs before signup. The row
  // is created in handleSignup once a session exists.
  function addSchool() {
    const name = schoolQuery.trim().replace(/\s+/g, ' ')
    if (name.length < 2) return
    setSchool({ pending: true, name })
  }

  async function handleSignup(e) {
    e.preventDefault()
    setSaving(true)

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { toast.error(signUpError.message); setSaving(false); return }

    const { error: acctError } = await supabase.from('accounts').insert({
      id: authData.user.id,
      account_type: mode,
      name,
      theme,                 // 'chalk' until the theme step; ThemeContext re-reads it
      blockers,
      preparing_for: goal,
      subjects
    })
    if (acctError) { toast.error(acctError.message); setSaving(false); return }

    if (mode === 'student') {
      // A school typed into the escape hatch is only written now that we have a
      // session — the `schools` insert policy requires one.
      let schoolId = school?.id || null
      if (school?.pending) {
        const row = await createSchool(school.name)
        if (!row) toast.error(`Couldn't add ${school.name} — you can set it later`)
        schoolId = row?.id || null
      }

      // Both are optional — a student who skipped the school step still gets a
      // profile, just without a class leaderboard until they pick one.
      const classId = await findOrCreateClass(schoolId, grade)
      await supabase.from('students').insert({
        owner_account_id: authData.user.id,
        managed_by_parent: false,
        name,
        class_grade: grade ? String(grade) : null,
        class_id: classId,
        exam_date: examDate || null,
        study_days: studyDays
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

    // The account exists now. Theme and the recap live on the far side of it,
    // where a locked Pro theme is a real lock and a recap has something to recap.
    setSaving(false)
    setStep('theme')
  }

  const inputStyle = {
    backgroundColor: T.cardAlt,
    borderColor: T.border,
    color: T.ink,
    transition: colorTransition
  }

  return (
    <div className="font-sans flex items-stretch justify-center sm:items-center sm:px-5 sm:py-8"
      style={{ minHeight: '100dvh', backgroundColor: T.bg, transition: colorTransition }}>
      <div className="w-full sm:h-auto sm:max-h-[700px] sm:max-w-sm rounded-none sm:rounded-3xl border-0 sm:border shadow-none sm:shadow-sm px-6 flex flex-col overflow-hidden"
        style={{
          backgroundColor: T.card, borderColor: T.border, transition: colorTransition,
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
        }}>

        {!['hook', 'curve', 'type'].includes(step) && (
          <div className="h-1.5 rounded-full mb-3 overflow-hidden flex-shrink-0" style={{ backgroundColor: T.cardAlt, transition: colorTransition }}>
            <div
              className="h-full w-full rounded-full bg-brand-500 origin-left transition-transform duration-[350ms]"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">

          {step === 'hook' && (
            <Screen id="hook" onBack={goBack} muted={T.muted} footer={<Btn onClick={() => setStep('curve')}>Continue</Btn>}
              overlay={<>
                <FloatingEmoji className="top-[13%] left-[7%] text-[46px]" delay={0.7} dur={2.8} phase={-0.4}>😱</FloatingEmoji>
                <FloatingEmoji className="top-[7%] right-[11%] text-[38px]" delay={1} dur={3.3} phase={-1.5}>🤯</FloatingEmoji>
                <FloatingEmoji className="top-[41%] right-[7%] text-[36px]" delay={1.3} dur={3} phase={-0.9}>📉</FloatingEmoji>
              </>}>
              <div className="mb-8 fade-soft">
                <p className="text-[76px] font-bold text-brand-500 leading-none"><NumberFlow value={hookPct} suffix="%" /></p>
                <p style={{ color: T.muted, transition: colorTransition }} className="text-[15px] font-semibold mt-2">of what you study today<br />is gone by tomorrow</p>
              </div>
              <h1 style={{ color: T.ink, transition: colorTransition }} className={`${hookReveal >= 1 ? 'fade-soft' : 'opacity-0'} text-[23px] font-bold tracking-tight leading-snug mb-2`}>You don't have a studying problem. You have a forgetting problem.</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className={`${hookReveal >= 2 ? 'fade-soft' : 'opacity-0'} text-[14.5px]`}>Psychologists proved the average student loses most of what they learn within just 24 hours.</p>
            </Screen>
          )}

          {step === 'curve' && (
            <Screen id="curve" onBack={goBack} muted={T.muted} footer={<Btn onClick={() => setStep('type')}>Continue</Btn>}
              overlay={<>
                <FloatingEmoji className="top-[10%] left-[8%] text-[46px]" delay={0.6} dur={2.9} phase={-0.3}>🧠</FloatingEmoji>
                <FloatingEmoji className="top-[22%] left-[30%] text-[36px]" delay={1} dur={3.2} phase={-1.6}>😔</FloatingEmoji>
                <FloatingEmoji className="top-[12%] right-[8%] text-[38px]" delay={1.3} dur={3} phase={-0.9}>📈</FloatingEmoji>
              </>}>
              <div className="mb-6 fade-soft">
                <svg viewBox="0 0 320 200" width="100%">
                  <line x1="34" y1="16" x2="34" y2="168" stroke={T.border} strokeWidth="2" />
                  <line x1="34" y1="168" x2="304" y2="168" stroke={T.border} strokeWidth="2" />
                  <path d="M 36 22 Q 62 128 120 148 T 300 162" fill="none" stroke={T.muted} strokeWidth="3" strokeDasharray="5 5" opacity=".5" />
                  <motion.path d="M 36 22 Q 56 82 74 88 L 74 42 Q 106 96 136 100 L 136 54 Q 186 104 226 106 L 226 64 Q 264 102 300 104"
                    fill="none" stroke="hsl(213,96%,56%)" strokeWidth="3.5" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }} />
                  <circle cx="74" cy="42" r="5" fill="hsl(213,96%,56%)" />
                  <circle cx="136" cy="54" r="5" fill="hsl(213,96%,56%)" />
                  <circle cx="226" cy="64" r="5" fill="hsl(213,96%,56%)" />
                  <text x="30" y="11" fontSize="10" fontWeight="700" fill={T.muted}>Memory</text>
                  <text x="262" y="184" fontSize="10" fontWeight="700" fill={T.muted}>Time →</text>
                  <text x="150" y="156" fontSize="9.5" fontWeight="600" fill={T.muted}>without revision</text>
                  <text x="148" y="46" fontSize="9.5" fontWeight="700" fill="hsl(213,96%,56%)">each revision lifts you back up</text>
                </svg>
              </div>
              <h1 style={{ color: T.ink, transition: colorTransition }} className={`${curveReveal >= 1 ? 'fade-soft' : 'opacity-0'} text-[23px] font-bold tracking-tight leading-snug mb-2`}>Every revision resets the curve.</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className={`${curveReveal >= 2 ? 'fade-soft' : 'opacity-0'} text-[14.5px]`}>Reviewing at the right moments moves knowledge into long-term memory — so it's still there on exam day.</p>
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
            <Screen id="goal" onBack={goBack} muted={T.muted} center={false} footer={<Btn disabled={!goal} onClick={() => setStep(next('goal'))}>Continue</Btn>}>
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

          {step === 'school' && (
            <Screen id="school" onBack={goBack} muted={T.muted} center={false} footer={<Btn onClick={() => setStep('schedule')}>Continue</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Join your class leaderboard</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">See how your class is doing. Skip this and you can add it later.</p>

              <p style={{ color: T.muted, transition: colorTransition }} className="text-[11px] font-bold tracking-widest mb-2">YOUR CLASS</p>
              <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1 mb-5">
                {GRADES.map(g => {
                  const sel = grade === g
                  return (
                    <button key={g} onClick={() => { setGrade(sel ? null : g); setSchool(null) }}
                      style={sel ? {} : { borderColor: T.border, color: T.ink, transition: colorTransition }}
                      className={`flex-shrink-0 w-12 h-12 rounded-2xl text-[15px] font-bold border-2 transition-colors ${
                        sel ? 'bg-brand-500 border-brand-500 text-white' : ''
                      }`}>
                      {g}
                    </button>
                  )
                })}
              </div>

              {school ? (
                <div className="border-2 border-brand-500 bg-brand-50 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-bold text-brand-600 truncate">{school.name}</p>
                    <p style={{ color: T.muted, transition: colorTransition }} className="text-[12px] truncate">{schoolSubtitle(school) || 'Added by you'}</p>
                  </div>
                  <button onClick={() => { setSchool(null); setSchoolQuery('') }} className="text-[12px] font-bold text-brand-500 flex-shrink-0">Change</button>
                </div>
              ) : (
                <>
                  <p style={{ color: T.muted, transition: colorTransition }} className="text-[11px] font-bold tracking-widest mb-2">YOUR SCHOOL</p>
                  <input value={schoolQuery} onChange={e => setSchoolQuery(e.target.value)}
                    placeholder={grade ? 'Search your school' : 'Pick your class first'} disabled={!grade} style={inputStyle}
                    className="w-full border-2 rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:border-brand-500 transition-colors disabled:opacity-50" />

                  <div className="mt-2 space-y-2">
                    {schoolResults.map(s => (
                      <button key={s.id} onClick={() => setSchool(s)}
                        style={{ borderColor: T.border, transition: colorTransition }}
                        className="w-full text-left border-2 rounded-2xl p-3 active:border-brand-500 transition-colors">
                        <p style={{ color: T.ink, transition: colorTransition }} className="text-[14px] font-bold">{s.name}</p>
                        <p style={{ color: T.muted, transition: colorTransition }} className="text-[12px]">{schoolSubtitle(s)}</p>
                      </button>
                    ))}
                  </div>

                  {/* Only offer the escape hatch when the search comes up empty.
                      Offering it beside a match invites a school named "machhi". */}
                  {grade && schoolQuery.trim().length >= 2 && !searching && !schoolResults.length && (
                    <div className="mt-3">
                      <p style={{ color: T.muted, transition: colorTransition }} className="text-[13px]">
                        No school found for Class {grade}.
                      </p>
                      <button onClick={addSchool} className="text-[13px] font-bold text-brand-500 mt-1">
                        Add "{schoolQuery.trim()}"
                      </button>
                    </div>
                  )}
                </>
              )}
            </Screen>
          )}

          {step === 'schedule' && (
            <Screen id="schedule" onBack={goBack} muted={T.muted} center={false} footer={<Btn onClick={() => setStep('subjects')}>Looks good</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Here's your default schedule</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">Based on proven memory research — the review cycle that moves knowledge into long-term memory.</p>

              {mode === 'student' && (
                <label className="flex items-center justify-between rounded-2xl px-4 py-3 mb-3"
                  style={{ backgroundColor: T.cardAlt, transition: colorTransition }}>
                  <span style={{ color: T.ink, transition: colorTransition }} className="text-[14.5px] font-bold">Exam date</span>
                  <input type="date" value={examDate} min={todayISO()} onChange={e => setExamDate(e.target.value)}
                    style={{ color: T.ink, transition: colorTransition }}
                    className="bg-transparent text-[14.5px] font-bold focus:outline-none" />
                </label>
              )}

              <div className="border-2 rounded-2xl p-4" style={{ borderColor: 'hsla(213,96%,56%,.33)' }}>
                <p className="text-[10px] font-bold tracking-widest text-brand-500 mb-3">STANDARD SCIENTIFIC SCHEDULE</p>
                {plannedOffsets.map(({ days }, i) => (
                  <motion.div key={days} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.25, ease: easing }}
                    className="flex items-center mb-2.5 last:mb-0">
                    <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 text-[12px] font-bold flex items-center justify-center mr-3">{i + 1}</span>
                    <span style={{ color: T.ink, transition: colorTransition }} className="text-[14.5px] font-bold">{offsetLabel(days)}</span>
                  </motion.div>
                ))}
                <p style={{ color: T.muted, transition: colorTransition }} className="text-[12px] mt-3">
                  {dropped > 0
                    ? `Your exam is ${whenExam}, so we've dropped ${dropped} ${dropped === 1 ? 'review that lands' : 'reviews that land'} after it.`
                    : 'You can switch any topic to a custom schedule later.'}
                </p>
              </div>

              {mode === 'student' && (
                <div className="mt-5">
                  <p style={{ color: T.muted, transition: colorTransition }} className="text-[11px] font-bold tracking-widest mb-2">WHICH DAYS DO YOU STUDY?</p>
                  <div className="flex gap-1.5">
                    {STUDY_DAYS.map(([d, label]) => {
                      const sel = studyDays.includes(d)
                      return (
                        <button key={d} onClick={() => toggleStudyDay(d)}
                          style={sel ? {} : { borderColor: T.border, color: T.muted, transition: colorTransition }}
                          className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                            sel ? 'bg-brand-500 border-brand-500 text-white' : ''
                          }`}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <p style={{ color: T.muted, transition: colorTransition }} className="text-[12px] mt-2">
                    {restDayNote}
                  </p>
                </div>
              )}
            </Screen>
          )}

          {step === 'subjects' && (
            <Screen id="subjects" onBack={goBack} muted={T.muted} center={false} footer={<Btn onClick={() => setStep('auth')}>Continue</Btn>}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">{copy.subjQ}</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">Tap to select or deselect — you can add more anytime.</p>
              <div className="flex flex-wrap gap-2">
                {[...subjectsForGoal(goal), ...customSubjects].map(s => {
                  const sel = subjects.includes(s)
                  return (
                    <button key={s} onClick={() => toggle(subjects, setSubjects, s)}
                      style={sel ? {} : { borderColor: T.border, color: T.ink, transition: colorTransition }}
                      className={`px-4 py-2.5 rounded-full text-[14.5px] font-bold border-2 transition-colors ${
                        sel ? `${subjectColor(s)} border-transparent text-white` : ''
                      }`}>
                      {s}
                    </button>
                  )
                })}
                {customDraft === null ? (
                  <button onClick={() => setCustomDraft('')}
                    className="px-4 py-2.5 rounded-full text-[14.5px] font-bold border-2 border-brand-500 bg-brand-50 text-brand-600">
                    + Add custom
                  </button>
                ) : (
                  <input autoFocus value={customDraft} onChange={e => setCustomDraft(e.target.value)}
                    onBlur={addCustomSubject}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addCustomSubject() }
                      if (e.key === 'Escape') setCustomDraft(null)
                    }}
                    placeholder="Subject name"
                    style={{ borderColor: T.border, color: T.ink, backgroundColor: T.cardAlt, transition: colorTransition }}
                    className="px-4 py-2.5 w-40 rounded-full text-[14.5px] font-bold border-2 focus:outline-none focus:border-brand-500" />
                )}
              </div>
            </Screen>
          )}

          {step === 'theme' && (
            <Screen id="theme" onBack={goBack} muted={T.muted} footer={<Btn onClick={() => setStep('summary')}>Continue</Btn>}>
              <span className="self-start text-[12px] font-bold text-brand-500 bg-brand-50 px-3 py-1 rounded-full mb-3">Account created ✓</span>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Choose your theme</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">Pick a design that fits your study mood — this card updates live.</p>
              <div className="grid grid-cols-2 gap-2.5">
                {THEMES.map(t => {
                  const sel = theme === t.id
                  const locked = !isPro && !FREE_THEMES.includes(t.id)
                  return (
                    <button key={t.id} onClick={() => pickTheme(t.id, locked)}
                      style={sel ? {} : { borderColor: T.border, transition: colorTransition }}
                      className={`text-left border-2 rounded-2xl p-3 transition-colors ${sel ? 'border-brand-500' : ''}`}>
                      <div className={`relative h-12 rounded-xl mb-2 border border-slate-200 ${t.swatch}`}>
                        {locked && <span className="absolute inset-0 flex items-center justify-center text-lg bg-black/25 rounded-xl">🔒</span>}
                      </div>
                      <p style={{ color: T.ink, transition: colorTransition }} className="text-[14.5px] font-bold flex items-center gap-1.5">
                        {t.name} {locked && <ProLock />}
                      </p>
                      <p style={{ color: T.muted, transition: colorTransition }} className="text-[11.5px]">{t.desc}</p>
                    </button>
                  )
                })}
              </div>
            </Screen>
          )}

          {step === 'summary' && (
            <Screen id="summary" onBack={goBack} muted={T.muted} center={false}
              footer={<Btn onClick={() => navigate(mode === 'parent' ? '/profiles' : '/home')}>
                {mode === 'parent' ? 'Add your child' : 'Start revising'}
              </Btn>}
              overlay={<>
                <FloatingEmoji className="top-[6%] left-[10%] text-[34px]" delay={0.5} dur={2.9} phase={-0.3}>⭐</FloatingEmoji>
                <FloatingEmoji className="top-[4%] right-[12%] text-[30px]" delay={0.8} dur={3.2} phase={-1.4}>✨</FloatingEmoji>
              </>}>
              <div className="text-center mb-6 fade-soft">
                <div className="w-20 h-20 rounded-full bg-brand-500 text-white text-[38px] font-bold flex items-center justify-center mx-auto mb-4">✓</div>
                <p style={{ color: T.muted, transition: colorTransition }} className="text-[15px] font-semibold">You're all set,</p>
                <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[28px] font-bold tracking-tight">{name}!</h1>
              </div>

              <div className="rounded-2xl p-4 space-y-3.5" style={{ backgroundColor: T.cardAlt, transition: colorTransition }}>
                {summaryRows.map(([label, value]) => (
                  <div key={label}>
                    <p style={{ color: T.muted, transition: colorTransition }} className="text-[11px] font-bold tracking-widest">{label}</p>
                    <p style={{ color: T.ink, transition: colorTransition }} className="text-[14.5px] font-bold mt-0.5">{value}</p>
                  </div>
                ))}
                {subjects.length > 0 && (
                  <div>
                    <p style={{ color: T.muted, transition: colorTransition }} className="text-[11px] font-bold tracking-widest mb-1.5">SUBJECTS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map(s => (
                        <span key={s} className={`${subjectColor(s)} text-white text-[12px] font-bold px-2.5 py-1 rounded-full`}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Screen>
          )}

          {step === 'auth' && (
            <Screen id="auth" onBack={goBack} muted={T.muted} center={false}>
              <h1 style={{ color: T.ink, transition: colorTransition }} className="text-[23px] font-bold tracking-tight mb-1">Almost there, {name}!</h1>
              <p style={{ color: T.muted, transition: colorTransition }} className="text-[14.5px] mb-4">
                {mode === 'student'
                  ? school ? `We'll put you on the Class ${grade} leaderboard at ${school.name}.` : 'Create your account to save your revisions.'
                  : "Create your account — you'll add your child right after."}
              </p>
              <form onSubmit={handleSignup} className="space-y-2.5">
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle}
                  className="w-full border rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle}
                  className="w-full border rounded-2xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                <input placeholder="Referral code (optional)" value={referralCode} onChange={e => setReferralCode(e.target.value)} style={inputStyle}
                  className="w-full border rounded-2xl px-4 py-3 text-[15px] uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors" />
                <Btn type="submit" disabled={saving}>{saving ? 'Creating account...' : 'Start revising'}</Btn>
              </form>
            </Screen>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
