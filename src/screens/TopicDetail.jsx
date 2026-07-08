import { useEffect, useState, useRef } from 'react'
import AppShell from '../lib/AppShell'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { usePro } from '../lib/ProContext'
import { useUpsell, ProLock } from '../lib/ProUpsell'
import { FREE_PHOTOS_PER_TOPIC } from '../lib/plan'

function randomId() {
  return globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const STANDARD_OFFSETS = [
  { label: 'same_day', days: 0 },
  { label: '1_day', days: 1 },
  { label: '1_week', days: 7 },
  { label: '1_month', days: 30 },
  { label: '4_months', days: 120 }
]

function labelForOffset(days) {
  if (days === 0) return 'same_day'
  if (days === 1) return '1_day'
  return `${days}_days`
}

export default function TopicDetail() {
  const { id } = useParams()
  const [topic, setTopic] = useState(null)
  const [recallCards, setRecallCards] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [revisions, setRevisions] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [savingCard, setSavingCard] = useState(false)

  const [journalText, setJournalText] = useState('')
  const [savingJournal, setSavingJournal] = useState(false)

  const [lightbox, setLightbox] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [schedType, setSchedType] = useState('standard')
  const [customOffsets, setCustomOffsets] = useState([])
  const [offsetInput, setOffsetInput] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const fileInputRef = useRef(null)

  function startEditSchedule() {
    setSchedType(topic.schedule_type || 'standard')
    setCustomOffsets([])
    setOffsetInput('')
    setEditingSchedule(true)
  }

  function pickCustomSchedule() {
    if (!isPro) {
      showUpsell({ title: 'Custom schedules', desc: 'Set your own revision intervals with SmartRevision Pro.' })
      return
    }
    setSchedType('custom')
  }

  function addCustomOffset() {
    const days = parseInt(offsetInput, 10)
    if (!Number.isInteger(days) || days < 0 || customOffsets.includes(days)) return
    setCustomOffsets([...customOffsets, days].sort((a, b) => a - b))
    setOffsetInput('')
  }

  async function saveSchedule() {
    if (schedType === 'custom' && customOffsets.length === 0) {
      return toast.error('Add at least one custom revision date')
    }
    setSavingSchedule(true)
    const { error: upErr } = await supabase.from('topics').update({ schedule_type: schedType }).eq('id', id)
    if (upErr) {
      if (upErr.message?.includes('PRO_REQUIRED')) {
        showUpsell({ title: 'Custom schedules', desc: 'Set your own revision intervals with SmartRevision Pro.' })
      } else {
        toast.error(upErr.message)
      }
      setSavingSchedule(false)
      return
    }
    // Replace only the upcoming (incomplete) revisions; keep completed history.
    await supabase.from('revisions').delete().eq('topic_id', id).eq('completed', false)
    const today = new Date()
    const offsets = schedType === 'custom'
      ? customOffsets.map(days => ({ label: labelForOffset(days), days }))
      : STANDARD_OFFSETS
    const rows = offsets.map(({ label, days }) => {
      const d = new Date(today)
      d.setDate(d.getDate() + days)
      return { topic_id: id, scheduled_date: d.toISOString().slice(0, 10), interval_label: label }
    })
    await supabase.from('revisions').insert(rows)
    setTopic(prev => ({ ...prev, schedule_type: schedType }))
    const { data: revs } = await supabase.from('revisions').select('*').eq('topic_id', id).order('scheduled_date', { ascending: true })
    setRevisions(revs || [])
    setEditingSchedule(false)
    setSavingSchedule(false)
    toast.success('Schedule updated')
  }

  const { user } = useAuth()
  const { isPro } = usePro()
  const showUpsell = useUpsell()
  const [referralCode, setReferralCode] = useState(null)

  function openPhotoPicker() {
    if (!isPro && images.length >= FREE_PHOTOS_PER_TOPIC) {
      showUpsell({ title: 'Multiple photos', desc: 'Attach as many notes/textbook photos as you want with Pro.' })
      return
    }
    fileInputRef.current?.click()
  }

  useEffect(() => {
    if (!user) return
    supabase.from('accounts').select('referral_code').eq('id', user.id).single()
      .then(({ data }) => setReferralCode(data?.referral_code || null))
  }, [user])

  async function handleShare() {
    if (!topic) return
    setSharing(true)
    let token = topic.share_token
    if (!topic.shared || !token) {
      token = token || randomId()
      const { error } = await supabase.from('topics').update({ shared: true, share_token: token }).eq('id', topic.id)
      if (error) { toast.error(error.message); setSharing(false); return }
      setTopic(prev => ({ ...prev, shared: true, share_token: token }))
    }
    const url = `${window.location.origin}/s/${token}${referralCode ? `?ref=${referralCode}` : ''}`
    const text = `Check out my "${topic.topic_name}" revision on SmartRevision 📚`
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: 'SmartRevision', text, url })
      } else if (navigator.share) {
        await navigator.share({ title: 'SmartRevision', text, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Share link copied!')
      }
    } catch {
      // share sheet dismissed — no-op
    }
    setSharing(false)
  }

  async function handleUnshare() {
    const { error } = await supabase.from('topics').update({ shared: false }).eq('id', topic.id)
    if (error) { toast.error(error.message); return }
    setTopic(prev => ({ ...prev, shared: false }))
    toast.success('Topic is now private')
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const img = deleteTarget
    setDeleting(true)
    const { error } = await supabase.from('topic_images').delete().eq('id', img.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    // Best-effort removal of the underlying storage object.
    const marker = '/topic-images/'
    const at = img.image_url.indexOf(marker)
    if (at >= 0) {
      const path = decodeURIComponent(img.image_url.slice(at + marker.length))
      await supabase.storage.from('topic-images').remove([path])
    }
    setImages(prev => prev.filter(x => x.id !== img.id))
    if (lightbox === img.image_url) setLightbox(null)
    setDeleting(false)
    setDeleteTarget(null)
    toast.success('Photo deleted')
  }

  async function onAddPhotos(e) {
    let files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length || !topic) return
    if (!isPro) {
      const room = Math.max(0, FREE_PHOTOS_PER_TOPIC - images.length)
      if (files.length > room) {
        files = files.slice(0, room)
        showUpsell({ title: 'Multiple photos', desc: 'Attach as many notes/textbook photos as you want with Pro.' })
      }
      if (!files.length) return
    }
    setUploading(true)
    const rows = []
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${topic.student_id}/${topic.id}/${randomId()}.${ext}`
      const { error } = await supabase.storage.from('topic-images').upload(path, file, { contentType: file.type })
      if (error) { console.error(error); continue }
      const { data: pub } = supabase.storage.from('topic-images').getPublicUrl(path)
      if (pub?.publicUrl) rows.push({ topic_id: topic.id, image_url: pub.publicUrl })
    }
    if (rows.length) {
      const { data, error } = await supabase.from('topic_images').insert(rows).select()
      if (!error && data) setImages(prev => [...prev, ...data])
      toast.success(rows.length > 1 ? `${rows.length} photos added` : 'Photo added')
    }
    if (rows.length < files.length) toast.error('Some photos could not be uploaded')
    setUploading(false)
  }

  useEffect(() => {
    loadAll()
  }, [id])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  async function loadAll() {
    setLoading(true)
    const [{ data: t }, { data: cards }, { data: entries }, { data: revs }, { data: imgs }] = await Promise.all([
      supabase.from('topics').select('*').eq('id', id).single(),
      supabase.from('recall_cards').select('*').eq('topic_id', id).order('id'),
      supabase.from('journal_entries').select('*').eq('topic_id', id).order('created_at', { ascending: false }),
      supabase.from('revisions').select('*').eq('topic_id', id).order('scheduled_date', { ascending: true }),
      supabase.from('topic_images').select('*').eq('topic_id', id).order('created_at')
    ])
    setTopic(t)
    setRecallCards(cards || [])
    setJournalEntries(entries || [])
    setRevisions(revs || [])
    setImages(imgs || [])
    setLoading(false)
  }

  async function addRecallCard(e) {
    e.preventDefault()
    if (!question.trim() || !answer.trim()) return
    setSavingCard(true)
    const { data, error } = await supabase
      .from('recall_cards')
      .insert({ topic_id: id, question, answer })
      .select()
      .single()
    if (!error) {
      setRecallCards([...recallCards, data])
      setQuestion('')
      setAnswer('')
      toast.success('Recall card added')
    } else {
      toast.error(error.message)
    }
    setSavingCard(false)
  }

  async function addJournalEntry(e) {
    e.preventDefault()
    if (!journalText.trim()) return
    setSavingJournal(true)
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ topic_id: id, entry: journalText })
      .select()
      .single()
    if (!error) {
      setJournalEntries([data, ...journalEntries])
      setJournalText('')
      toast.success('Journal entry added')
    } else {
      toast.error(error.message)
    }
    setSavingJournal(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading...</div>
  if (!topic) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Topic not found</div>

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto space-y-4">

        <Link to="/home" className="text-[12px] font-bold text-[var(--muted)]">← Back to Home</Link>

        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight">{topic.topic_name}</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">{topic.subject}</p>
          <div className="flex gap-2 mt-3">
            {topic.familiarity && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--slate-txt)]">
                {topic.familiarity.replace('_', ' ')}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--slate-txt)]">
              {topic.priority} priority
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {images.map(img => (
              <div key={img.id} className="relative w-20 h-20">
                <button
                  type="button"
                  onClick={() => setLightbox(img.image_url)}
                  className="block w-full h-full rounded-xl overflow-hidden border border-[var(--border)] active:scale-[0.97] transition-transform"
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(img)}
                  aria-label="Delete photo"
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/70 text-white text-[13px] leading-none flex items-center justify-center shadow active:scale-95 transition-transform"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={openPhotoPicker}
              disabled={uploading}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {uploading ? '…' : <><span className="text-xl leading-none">+</span>Photo</>}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onAddPhotos} />

          {topic.notes && <p className="text-[14px] text-[var(--slate-txt)] mt-3">{topic.notes}</p>}

          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="mt-4 w-full py-2.5 rounded-2xl border-2 border-brand-100 text-brand-500 text-[13px] font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {sharing ? 'Preparing link…' : '🔗 Share topic'}
          </button>
          {topic.shared && (
            <p className="text-[11px] text-[var(--muted)] text-center mt-2">
              Public link is on ·{' '}
              <button type="button" onClick={handleUnshare} className="font-bold text-[var(--slate-txt)] underline">Make private</button>
            </p>
          )}
        </motion.div>

        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, delay: 0.025, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[13px] font-bold text-[var(--ink)]">Schedule</h2>
            {editingSchedule ? (
              <button type="button" onClick={() => setEditingSchedule(false)} className="text-[11px] font-bold text-[var(--muted)]">Cancel</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--slate-txt)] uppercase tracking-wide">
                  {topic.schedule_type || 'standard'}
                </span>
                <button type="button" onClick={startEditSchedule} className="text-[11px] font-bold text-brand-500">Edit</button>
              </div>
            )}
          </div>

          {editingSchedule ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSchedType('standard')}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors ${
                    schedType === 'standard' ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={pickCustomSchedule}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-colors inline-flex items-center justify-center gap-1.5 ${
                    schedType === 'custom' ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  Custom {!isPro && <ProLock />}
                </button>
              </div>

              {schedType === 'standard' && (
                <p className="text-[11px] text-[var(--muted)]">Same day, 1 day, 1 week, 1 month, 4 months</p>
              )}

              {schedType === 'custom' && (
                <div>
                  {customOffsets.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {customOffsets.map(days => (
                        <span key={days} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] font-bold border-2 border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]">
                          {labelForOffset(days).replace('_', ' ')}
                          <button type="button" onClick={() => setCustomOffsets(customOffsets.filter(d => d !== days))} className="text-brand-500 leading-none" aria-label={`Remove ${days} day offset`}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="number" min="0" placeholder="Days after today" value={offsetInput} onChange={(e) => setOffsetInput(e.target.value)} className="flex-1 border border-[var(--border)] rounded-2xl px-4 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
                    <button type="button" onClick={addCustomOffset} className="px-4 py-2 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-[0.97] transition-transform">+ Add</button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[var(--muted)]">Saving replaces your upcoming revisions with a fresh schedule from today. Completed ones are kept.</p>

              <button
                type="button"
                onClick={saveSchedule}
                disabled={savingSchedule}
                className="w-full py-2.5 rounded-2xl bg-brand-500 text-white text-[13px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform"
              >
                {savingSchedule ? 'Saving…' : 'Save schedule'}
              </button>
            </div>
          ) : revisions.length === 0 ? (
            <p className="text-[12px] text-[var(--muted)]">No revisions scheduled.</p>
          ) : (
            <div className="space-y-2">
              {revisions.map(r => {
                const today = new Date().toISOString().slice(0, 10)
                const status = r.completed ? 'done' : r.scheduled_date < today ? 'overdue' : 'upcoming'
                const statusStyle = {
                  done: 'text-emerald-600 bg-[rgba(16,185,129,0.14)]',
                  overdue: 'text-red-500 bg-[rgba(239,68,68,0.14)]',
                  upcoming: 'text-[var(--slate-txt)] bg-[var(--card-alt)]'
                }
                const statusLabel = { done: 'Done', overdue: 'Overdue', upcoming: 'Upcoming' }
                return (
                  <div key={r.id} className="flex justify-between items-center bg-[var(--card-alt)] rounded-2xl px-3 py-2.5">
                    <div>
                      <p className="text-[12px] font-bold text-[var(--slate-txt)]">
                        {new Date(`${r.scheduled_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] text-[var(--muted)]">{r.interval_label?.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[status]}`}>
                      {statusLabel[status]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <h2 className="text-[13px] font-bold text-[var(--ink)] mb-3">Recall cards</h2>

          {recallCards.length === 0 && (
            <p className="text-[12px] text-[var(--muted)] mb-3">No recall cards yet — add a short question you want to test yourself on.</p>
          )}

          <div className="space-y-2 mb-3">
            {recallCards.map(card => (
              <div key={card.id} className="bg-[var(--card-alt)] rounded-2xl p-3">
                <p className="text-[12px] font-bold text-[var(--slate-txt)]">Q: {card.question}</p>
                <p className="text-[12px] text-[var(--slate-txt)] mt-1">A: {card.answer}</p>
              </div>
            ))}
          </div>

          <form onSubmit={addRecallCard} className="space-y-2">
            <input
              type="text"
              placeholder="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
            />
            <input
              type="text"
              placeholder="Answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
            />
            <button
              type="submit"
              disabled={savingCard}
              className="w-full py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform"
            >
              {savingCard ? 'Adding...' : '+ Add recall card'}
            </button>
          </form>
        </motion.div>

        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <h2 className="text-[13px] font-bold text-[var(--ink)] mb-3">Journal</h2>

          {journalEntries.length === 0 && (
            <p className="text-[12px] text-[var(--muted)] mb-3">Note mistakes, difficult concepts, or things to revisit here.</p>
          )}

          <div className="space-y-2 mb-3">
            {journalEntries.map(entry => (
              <div key={entry.id} className="bg-[var(--card-alt)] rounded-2xl p-3">
                <p className="text-[12px] text-[var(--slate-txt)]">{entry.entry}</p>
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={addJournalEntry} className="space-y-2">
            <textarea
              placeholder="Write a note..."
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              rows={2}
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
            />
            <button
              type="submit"
              disabled={savingJournal}
              className="w-full py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform"
            >
              {savingJournal ? 'Adding...' : '+ Add journal entry'}
            </button>
          </form>
        </motion.div>

      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !deleting && setDeleteTarget(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-lg p-5"
            >
              <h3 className="text-[15px] font-bold text-[var(--ink)]">Delete this photo?</h3>
              <p className="text-[13px] text-[var(--muted)] mt-1 mb-4">This can't be undone.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-2xl border-2 border-[var(--border)] text-[13px] font-bold text-[var(--muted)] active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-[13px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <motion.img
              key={lightbox}
              src={lightbox}
              alt=""
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 text-white text-xl leading-none flex items-center justify-center active:scale-95 transition-transform"
              style={{ top: 'max(16px, env(safe-area-inset-top))' }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div></AppShell>
  )
}
