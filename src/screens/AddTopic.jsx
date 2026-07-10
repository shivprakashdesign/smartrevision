import { useState, useEffect, useRef } from 'react'
import AppShell from '../lib/AppShell'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import { usePro } from '../lib/ProContext'
import { useUpsell, ProLock } from '../lib/ProUpsell'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Cancel01Icon, PlusSignIcon, LockIcon } from '@hugeicons/core-free-icons'
import { FREE_TOPIC_LIMIT, FREE_PHOTOS_PER_TOPIC } from '../lib/plan'
import { STANDARD_OFFSETS, labelForOffset } from '../lib/schedule'

const DEFAULT_SUBJECTS = ['Maths', 'Science', 'Computer Sci.', 'Languages', 'History']
const STEP_LABELS = ['Topic', 'Details', 'Schedule']

function randomId() {
  return globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const inputClass = 'w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors'
const labelClass = 'text-[11px] font-bold text-[var(--muted)] mb-1.5 tracking-wide'

export default function AddTopic() {
  const navigate = useNavigate()
  const { student, loading: studentLoading } = useStudentProfile()
  const { isPro } = usePro()
  const showUpsell = useUpsell()

  const [step, setStep] = useState(1)
  const [topicCount, setTopicCount] = useState(0)
  const [subject, setSubject] = useState('')
  const [customSubject, setCustomSubject] = useState(false)
  const [topicName, setTopicName] = useState('')
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([])
  const [shared, setShared] = useState(false)
  const [pastSubjects, setPastSubjects] = useState([])
  const [scheduleType, setScheduleType] = useState('standard')
  const [customOffsets, setCustomOffsets] = useState([])
  const [offsetInput, setOffsetInput] = useState('')
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef(null)
  const photosRef = useRef([])
  photosRef.current = photos

  const subjectOptions = [...new Set([...pastSubjects, ...DEFAULT_SUBJECTS])]

  useEffect(() => {
    if (!student) return
    supabase
      .from('topics')
      .select('subject')
      .eq('student_id', student.id)
      .then(({ data }) => {
        if (data) {
          setPastSubjects([...new Set(data.map(t => t.subject).filter(Boolean))])
          setTopicCount(data.length)
        }
      })
  }, [student])

  const atTopicLimit = !isPro && topicCount >= FREE_TOPIC_LIMIT

  function pickCustomSchedule() {
    if (!isPro) {
      showUpsell({ title: 'Custom schedules', desc: 'Set your own revision intervals with SmartRevision Pro.' })
      return
    }
    setScheduleType('custom')
  }

  function openPhotoPicker() {
    if (!isPro && photos.length >= FREE_PHOTOS_PER_TOPIC) {
      showUpsell({ title: 'Multiple photos', desc: 'Attach as many notes/textbook photos as you want with Pro.' })
      return
    }
    fileInputRef.current?.click()
  }

  // Release preview object URLs when leaving the screen.
  useEffect(() => () => { photosRef.current.forEach(p => URL.revokeObjectURL(p.url)) }, [])

  function onPickPhotos(e) {
    let files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!isPro) {
      const room = Math.max(0, FREE_PHOTOS_PER_TOPIC - photos.length)
      if (files.length > room) {
        files = files.slice(0, room)
        showUpsell({ title: 'Multiple photos', desc: 'Attach as many notes/textbook photos as you want with Pro.' })
      }
    }
    if (files.length) setPhotos(prev => [...prev, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))])
  }

  function removePhoto(idx) {
    setPhotos(prev => {
      const next = [...prev]
      const [removed] = next.splice(idx, 1)
      if (removed) URL.revokeObjectURL(removed.url)
      return next
    })
  }

  function addCustomOffset() {
    const days = parseInt(offsetInput, 10)
    if (!Number.isInteger(days) || days < 0 || customOffsets.includes(days)) return
    setCustomOffsets([...customOffsets, days].sort((a, b) => a - b))
    setOffsetInput('')
  }

  function removeCustomOffset(days) {
    setCustomOffsets(customOffsets.filter(d => d !== days))
  }

  function goNext() {
    if (step === 1) {
      if (atTopicLimit) {
        showUpsell({ title: 'Topic limit reached', desc: `Free plans include ${FREE_TOPIC_LIMIT} topics. Upgrade to Pro for unlimited topics.` })
        return
      }
      if (!subject.trim()) return toast.error('Please select or enter a subject')
      if (!topicName.trim()) return toast.error('Please enter a topic name')
    }
    setStep(s => Math.min(3, s + 1))
  }

  function goBack() {
    if (step === 1) { navigate('/home'); return }
    setStep(s => Math.max(1, s - 1))
  }

  async function uploadPhotos(topicId) {
    const rows = []
    for (const p of photos) {
      const ext = (p.file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${student.id}/${topicId}/${randomId()}.${ext}`
      const { error } = await supabase.storage.from('topic-images').upload(path, p.file, { contentType: p.file.type })
      if (error) { console.error(error); continue }
      const { data: pub } = supabase.storage.from('topic-images').getPublicUrl(path)
      if (pub?.publicUrl) rows.push({ topic_id: topicId, image_url: pub.publicUrl })
    }
    return rows
  }

  async function handleSubmit() {
    if (!student) return
    if (scheduleType === 'custom' && customOffsets.length === 0) {
      return toast.error('Add at least one custom revision date')
    }
    setSaving(true)

    const today = new Date()
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert({
        student_id: student.id,
        subject,
        topic_name: topicName,
        date_learned: today.toISOString().slice(0, 10),
        priority,
        notes,
        schedule_type: scheduleType,
        shared,
        share_token: shared ? randomId() : null
      })
      .select()
      .single()

    if (topicError) {
      if (topicError.message?.includes('PRO_REQUIRED')) {
        showUpsell({ title: 'Upgrade to Pro', desc: 'This needs SmartRevision Pro — custom schedules and unlimited topics.' })
      } else {
        toast.error(topicError.message)
      }
      setSaving(false)
      return
    }

    if (photos.length) {
      const rows = await uploadPhotos(topic.id)
      if (rows.length) await supabase.from('topic_images').insert(rows)
      if (rows.length < photos.length) toast.error('Some photos could not be uploaded')
    }

    const offsets = scheduleType === 'custom'
      ? customOffsets.map(days => ({ label: labelForOffset(days), days }))
      : STANDARD_OFFSETS

    const revisionRows = offsets.map(({ label, days }) => {
      const d = new Date(today)
      d.setDate(d.getDate() + days)
      return { topic_id: topic.id, scheduled_date: d.toISOString().slice(0, 10), interval_label: label }
    })

    const { error: revisionsError } = await supabase.from('revisions').insert(revisionRows)
    if (revisionsError) {
      toast.error(revisionsError.message)
      setSaving(false)
      return
    }

    toast.success('Topic added & revisions scheduled')
    navigate('/home')
  }

  if (studentLoading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading...</div>

  const priorityOpts = [
    { v: 'high', l: 'High' },
    { v: 'medium', l: 'Medium' },
    { v: 'low', l: 'Low' }
  ]

  return (
    <AppShell><div className="px-6 py-10 flex flex-col items-center">
      <div className="w-full max-w-sm space-y-3">
        <Link to="/home" className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--muted)]">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2.2} /> Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-6"
        >
          <div className="flex gap-1.5 mb-4">
            {[1, 2, 3].map(n => (
              <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? 'bg-brand-500' : 'bg-[var(--card-alt)]'}`} />
            ))}
          </div>

          <div className="flex items-baseline justify-between mb-4">
            <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight">Add a topic</h1>
            <span className="text-[11px] font-bold text-[var(--muted)]">Step {step} of 3 · {STEP_LABELS[step - 1]}</span>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="space-y-3">
                {atTopicLimit && (
                  <button type="button" onClick={() => showUpsell({ title: 'Topic limit reached', desc: `Free plans include ${FREE_TOPIC_LIMIT} topics. Upgrade to Pro for unlimited topics.` })}
                    className="w-full text-left rounded-2xl p-3 bg-[rgba(37,99,235,0.08)] active:scale-[0.99] transition-transform">
                    <p className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-500">You've reached the free limit of {FREE_TOPIC_LIMIT} topics <HugeiconsIcon icon={LockIcon} size={13} strokeWidth={2} /></p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Tap to upgrade to Pro for unlimited topics.</p>
                  </button>
                )}
                <div>
                  <p className={labelClass}>Subject</p>
                  <div className="flex flex-wrap gap-2">
                    {subjectOptions.map(s => {
                      const selected = !customSubject && subject === s
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setSubject(s); setCustomSubject(false) }}
                          className={`px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-colors ${
                            selected ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                          }`}
                        >
                          {s}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => { setCustomSubject(true); setSubject('') }}
                      className={`px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-colors ${
                        customSubject ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                      }`}
                    >
                      Other
                    </button>
                  </div>
                  {customSubject && (
                    <input type="text" placeholder="Subject (e.g. Chemistry)" value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus className={`mt-2 ${inputClass}`} />
                  )}
                </div>

                <div>
                  <p className={labelClass}>Topic name</p>
                  <input type="text" placeholder="e.g. Electrochemistry" value={topicName} onChange={(e) => setTopicName(e.target.value)} className={inputClass} />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="space-y-3">
                <div>
                  <p className={labelClass}>Priority</p>
                  <div className="flex gap-2">
                    {priorityOpts.map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setPriority(opt.v)}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                          priority === opt.v ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Photos (optional) {!isPro && <ProLock />}</p>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)]">
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label="Remove photo"
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={openPhotoPicker}
                      aria-label="Add photo"
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] flex items-center justify-center active:scale-[0.97] transition-transform"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={22} strokeWidth={2} />
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} />
                </div>

                <div>
                  <p className={labelClass}>Notes (optional)</p>
                  <textarea placeholder="Anything worth remembering..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--ink)]">Make shareable</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Anyone with the link can view this topic.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={shared}
                    onClick={() => setShared(s => !s)}
                    className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${shared ? 'bg-brand-500' : 'bg-[var(--card-alt)]'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${shared ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="space-y-3">
                <div>
                  <p className={labelClass}>Schedule</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleType('standard')}
                      className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                        scheduleType === 'standard' ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={pickCustomSchedule}
                      className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors inline-flex items-center justify-center gap-1.5 ${
                        scheduleType === 'custom' ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                      }`}
                    >
                      Custom {!isPro && <ProLock />}
                    </button>
                  </div>

                  {scheduleType === 'standard' && (
                    <p className="text-[11px] text-[var(--muted)] mt-2">Same day, 1 day, 1 week, 1 month, 4 months</p>
                  )}

                  {scheduleType === 'custom' && (
                    <div className="mt-2">
                      {customOffsets.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {customOffsets.map(days => (
                            <span key={days} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] font-bold border-2 border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]">
                              {labelForOffset(days).replace('_', ' ')}
                              <button type="button" onClick={() => removeCustomOffset(days)} className="text-brand-500 inline-flex items-center" aria-label={`Remove ${days} day offset`}><HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2.5} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input type="number" min="0" placeholder="Days after learning" value={offsetInput} onChange={(e) => setOffsetInput(e.target.value)} className="flex-1 border border-[var(--border)] rounded-2xl px-4 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
                        <button type="button" onClick={addCustomOffset} className="px-4 py-2 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-[0.97] transition-transform">+ Add</button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 mt-5">
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="px-5 py-3 rounded-2xl border-2 border-[var(--border)] text-[14px] font-bold text-[var(--muted)] active:scale-[0.97] transition-transform"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.97] transition-transform"
              >
                {saving ? 'Saving...' : 'Add topic'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div></AppShell>
  )
}
