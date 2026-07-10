import { useEffect, useState, useRef } from 'react'
import AppShell from '../lib/AppShell'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { usePro } from '../lib/ProContext'
import { useUpsell, ProLock } from '../lib/ProUpsell'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon, Cancel01Icon, PlusSignIcon, Link01Icon, Archive02Icon, InboxIcon,
  FlashIcon, PencilEdit02Icon, Delete02Icon, Calendar03Icon, ArrowUp01Icon,
  File01Icon, StickyNote01Icon, Clock01Icon, Brain02Icon, ArrowRight01Icon, AlarmClockIcon
} from '@hugeicons/core-free-icons'
import { FREE_PHOTOS_PER_TOPIC } from '../lib/plan'
import { nextRevision, intervalToDays, computeMemory } from '../lib/metrics'
import { subjectColor, subjectGradient } from '../lib/subjects'
import { offsetsFor, labelForOffset, scheduleSummary } from '../lib/schedule'
import { useStudentProfile } from '../lib/useStudentProfile'

function randomId() {
  return globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const fullDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const dayMonth = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

function relativeTime(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const m = Math.floor(days / 30)
  if (m < 12) return `${m}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// Four-state status for a revision, matching the timeline legend.
function revStatus(r, today = todayISO()) {
  if (r.completed) return 'completed'
  if (r.scheduled_date < today) return 'overdue'
  if (r.scheduled_date === today) return 'ready'
  return 'upcoming'
}
const REV_STYLE = {
  completed: { label: 'Completed', dot: 'bg-emerald-500', chip: 'text-emerald-600 bg-emerald-500/12' },
  overdue: { label: 'Overdue', dot: 'bg-orange-500', chip: 'text-orange-600 bg-orange-500/12' },
  ready: { label: 'Ready to revise', dot: 'bg-amber-500', chip: 'text-amber-600 bg-amber-500/12' },
  upcoming: { label: 'Upcoming', dot: 'bg-[var(--muted)]', chip: 'text-[var(--slate-txt)] bg-[var(--card-alt)]' }
}

// Recorded recall quality shown on completed revisions.
const QUALITY = {
  good: { emoji: '💪', label: 'Recalled well', cls: 'text-emerald-600 bg-emerald-500/12' },
  okay: { emoji: '🙂', label: 'Recalled okay', cls: 'text-amber-600 bg-amber-500/12' },
  struggled: { emoji: '😅', label: 'Struggled', cls: 'text-orange-600 bg-orange-500/12' }
}

// Retention-tone chip: reads as "revise me", not failure, when low.
function memChipCls(m) {
  if (m == null) return 'text-[var(--slate-txt)] bg-[var(--card-alt)]'
  if (m >= 67) return 'text-emerald-600 bg-emerald-500/12'
  if (m >= 40) return 'text-amber-600 bg-amber-500/12'
  return 'text-red-500 bg-red-500/12'
}

function daysUntil(iso) {
  const d = new Date(`${iso}T00:00:00`)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.round((d - t) / 86400000)
}
function countdownLabel(iso) {
  const n = daysUntil(iso)
  if (n === 0) return 'Due today'
  if (n < 0) return `${-n} day${n === -1 ? '' : 's'} overdue`
  return `Next in ${n} day${n === 1 ? '' : 's'}`
}
function countdownCls(iso) {
  const n = daysUntil(iso)
  if (n < 0) return 'text-red-500 bg-red-500/12'
  if (n === 0) return 'text-amber-600 bg-amber-500/12'
  return 'text-[var(--slate-txt)] bg-[var(--card-alt)]'
}
function countdownIcon(iso) {
  return daysUntil(iso) <= 0 ? AlarmClockIcon : Clock01Icon
}

const PRIORITIES = ['high', 'medium', 'low']

export default function TopicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { student } = useStudentProfile()   // for exam_date — truncates a rebuilt schedule
  const [topic, setTopic] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [recallCards, setRecallCards] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [revisions, setRevisions] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  const [contentTab, setContentTab] = useState('cards') // 'cards' | 'journal'
  const [scheduleCollapsed, setScheduleCollapsed] = useState(false)

  const [editingTopic, setEditingTopic] = useState(false)
  const [etTitle, setEtTitle] = useState('')
  const [etSubject, setEtSubject] = useState('')
  const [etNotes, setEtNotes] = useState('')
  const [etPriority, setEtPriority] = useState('medium')
  const [savingTopic, setSavingTopic] = useState(false)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [savingCard, setSavingCard] = useState(false)
  const [editCardId, setEditCardId] = useState(null)
  const [editCardQ, setEditCardQ] = useState('')
  const [editCardA, setEditCardA] = useState('')

  const [journalText, setJournalText] = useState('')
  const [savingJournal, setSavingJournal] = useState(false)
  const [editEntryId, setEditEntryId] = useState(null)
  const [editEntryText, setEditEntryText] = useState('')

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
    // Switching back to the standard schedule rebuilds it from today, so it is
    // truncated against the exam date just like a freshly added topic.
    const offsets = schedType === 'custom'
      ? customOffsets.map(days => ({ label: labelForOffset(days), days }))
      : offsetsFor(student?.exam_date, today)
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

  function startEditTopic() {
    setEtTitle(topic.topic_name || '')
    setEtSubject(topic.subject || '')
    setEtNotes(topic.notes || '')
    setEtPriority(topic.priority || 'medium')
    setEditingTopic(true)
  }

  async function saveTopic() {
    if (!etTitle.trim()) return toast.error('Title is required')
    setSavingTopic(true)
    const patch = {
      topic_name: etTitle.trim(),
      subject: etSubject.trim() || null,
      notes: etNotes.trim() || null,
      priority: etPriority
    }
    const { error } = await supabase.from('topics').update(patch).eq('id', id)
    setSavingTopic(false)
    if (error) { toast.error(error.message); return }
    setTopic(prev => ({ ...prev, ...patch }))
    setEditingTopic(false)
    toast.success('Topic updated')
  }

  async function toggleArchive() {
    const next = !topic.archived
    setArchiving(true)
    const { error } = await supabase.from('topics').update({ archived: next }).eq('id', topic.id)
    setArchiving(false)
    if (error) { toast.error(error.message); return }
    setTopic(prev => ({ ...prev, archived: next }))
    if (next) {
      const topicId = topic.id
      toast.success('Topic archived', {
        action: { label: 'Undo', onClick: () => supabase.from('topics').update({ archived: false }).eq('id', topicId) }
      })
      navigate('/topics')
    } else {
      toast.success('Topic restored')
    }
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

  function startEditCard(card) {
    setEditCardId(card.id)
    setEditCardQ(card.question)
    setEditCardA(card.answer)
  }

  async function saveEditCard() {
    if (!editCardQ.trim() || !editCardA.trim()) return toast.error('Both sides are required')
    const { error } = await supabase.from('recall_cards').update({ question: editCardQ, answer: editCardA }).eq('id', editCardId)
    if (error) { toast.error(error.message); return }
    setRecallCards(prev => prev.map(c => (c.id === editCardId ? { ...c, question: editCardQ, answer: editCardA } : c)))
    setEditCardId(null)
    toast.success('Card updated')
  }

  async function deleteCard(card) {
    const { error } = await supabase.from('recall_cards').delete().eq('id', card.id)
    if (error) { toast.error(error.message); return }
    setRecallCards(prev => prev.filter(c => c.id !== card.id))
    toast.success('Card deleted', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const { data } = await supabase.from('recall_cards').insert({ topic_id: id, question: card.question, answer: card.answer }).select().single()
          if (data) setRecallCards(prev => [...prev, data])
        }
      }
    })
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

  function startEditEntry(entry) {
    setEditEntryId(entry.id)
    setEditEntryText(entry.entry)
  }

  async function saveEditEntry() {
    if (!editEntryText.trim()) return toast.error('Entry cannot be empty')
    const { error } = await supabase.from('journal_entries').update({ entry: editEntryText }).eq('id', editEntryId)
    if (error) { toast.error(error.message); return }
    setJournalEntries(prev => prev.map(en => (en.id === editEntryId ? { ...en, entry: editEntryText } : en)))
    setEditEntryId(null)
    toast.success('Entry updated')
  }

  async function deleteEntry(entry) {
    const { error } = await supabase.from('journal_entries').delete().eq('id', entry.id)
    if (error) { toast.error(error.message); return }
    setJournalEntries(prev => prev.filter(en => en.id !== entry.id))
    toast.success('Entry deleted', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const { data } = await supabase.from('journal_entries').insert({ topic_id: id, entry: entry.entry }).select().single()
          if (data) setJournalEntries(prev => [data, ...prev])
        }
      }
    })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading...</div>
  if (!topic) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Topic not found</div>

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  const next = nextRevision(revisions)
  const memory = computeMemory(revisions)
  const startISO = topic.date_learned || revisions[0]?.scheduled_date

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--muted)] active:opacity-70">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2.2} /> Back
          </button>
          <button
            type="button"
            onClick={toggleArchive}
            disabled={archiving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[12px] font-bold text-[var(--slate-txt)] active:scale-95 transition-transform disabled:opacity-50"
          >
            <HugeiconsIcon icon={topic.archived ? InboxIcon : Archive02Icon} size={14} strokeWidth={2} />
            {archiving ? '…' : topic.archived ? 'Restore' : 'Archive'}
          </button>
        </div>

        {/* Hero */}
        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
          style={{ backgroundImage: subjectGradient(topic.subject) }}
        >
          {editingTopic ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-bold text-[var(--ink)]">Edit topic</span>
                <button type="button" onClick={() => setEditingTopic(false)} className="text-[12px] font-bold text-[var(--muted)]">Cancel</button>
              </div>
              <input value={etTitle} onChange={(e) => setEtTitle(e.target.value)} placeholder="Topic name" className="w-full border border-[var(--border)] rounded-2xl px-4 py-2.5 text-[15px] font-bold text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
              <input value={etSubject} onChange={(e) => setEtSubject(e.target.value)} placeholder="Subject" className="w-full border border-[var(--border)] rounded-2xl px-4 py-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
              <div>
                <p className="text-[11px] font-bold text-[var(--muted)] mb-1.5">Priority</p>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button key={p} type="button" onClick={() => setEtPriority(p)} className={`flex-1 py-2 rounded-xl text-[12px] font-bold capitalize border-2 transition-colors ${etPriority === p ? 'border-brand-500 text-brand-500 bg-brand-500/12' : 'border-[var(--border)] text-[var(--muted)]'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <textarea value={etNotes} onChange={(e) => setEtNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className="w-full border border-[var(--border)] rounded-2xl px-4 py-2.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
              <button type="button" onClick={saveTopic} disabled={savingTopic} className="w-full py-2.5 rounded-2xl bg-brand-500 text-white text-[13px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform">
                {savingTopic ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full text-white truncate ${subjectColor(topic.subject)}`}>
                  {topic.subject || 'General'}
                </span>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] font-bold text-[var(--muted)]">{topic.shared ? 'Shared · Mine' : 'Private'}</span>
                  <button type="button" onClick={startEditTopic} aria-label="Edit topic" className="text-[var(--muted)] active:scale-90 transition-transform">
                    <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <h1 className="text-[24px] font-bold text-[var(--ink)] tracking-tight leading-tight mt-2.5">{topic.topic_name}</h1>

              {/* Retention + countdown */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${memChipCls(memory)}`}>
                  <HugeiconsIcon icon={Brain02Icon} size={13} strokeWidth={2} />{memory == null ? 'New' : `${memory}% memory`}
                </span>
                {next && (
                  <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${countdownCls(next.scheduled_date)}`}>
                    <HugeiconsIcon icon={countdownIcon(next.scheduled_date)} size={13} strokeWidth={2} />{countdownLabel(next.scheduled_date)}
                  </span>
                )}
              </div>

              {/* Meta counts */}
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2.5 text-[12px] font-bold text-[var(--slate-txt)]">
                <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={File01Icon} size={14} strokeWidth={2} />{recallCards.length} card{recallCards.length === 1 ? '' : 's'}</span>
                <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={StickyNote01Icon} size={14} strokeWidth={2} />{journalEntries.length} note{journalEntries.length === 1 ? '' : 's'}</span>
                {topic.created_at && (
                  <span className="inline-flex items-center gap-1 text-[var(--muted)]"><HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={2} />Added {relativeTime(topic.created_at)}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {topic.archived && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 uppercase tracking-wide">Archived</span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-alt)] text-[var(--slate-txt)]">
                  {topic.priority} priority
                </span>
              </div>
            </>
          )}

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
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center shadow active:scale-95 transition-transform"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2.5} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={openPhotoPicker}
              disabled={uploading}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border)] text-[var(--muted)] text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {uploading ? '…' : <><HugeiconsIcon icon={PlusSignIcon} size={20} strokeWidth={2} />Photo</>}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onAddPhotos} />

          {!editingTopic && topic.notes && <p className="text-[14px] text-[var(--slate-txt)] mt-3">{topic.notes}</p>}

          {/* Primary actions */}
          {!editingTopic && <>
          <div className="flex gap-2 mt-4">
            {next ? (
              <Link
                to={`/revise/${next.id}`}
                className="flex-1 py-2.5 rounded-2xl bg-brand-500 text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
              >
                <HugeiconsIcon icon={FlashIcon} size={16} strokeWidth={2} /> Revise now
              </Link>
            ) : (
              <div className="flex-1 py-2.5 rounded-2xl bg-[var(--card-alt)] text-[var(--muted)] text-[13px] font-bold inline-flex items-center justify-center gap-1.5">
                All revisions done 🎉
              </div>
            )}
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-2.5 rounded-2xl border-2 border-brand-100 text-brand-500 text-[13px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
            >
              {sharing ? 'Preparing…' : <><HugeiconsIcon icon={Link01Icon} size={15} strokeWidth={2} /> Share</>}
            </button>
          </div>
          {topic.shared && (
            <p className="text-[11px] text-[var(--muted)] text-center mt-2">
              Public link is on ·{' '}
              <button type="button" onClick={handleUnshare} className="font-bold text-[var(--slate-txt)] underline">Make private</button>
            </p>
          )}
          </>}
        </motion.div>

        {/* Revision timeline */}
        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, delay: 0.025, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-start gap-2">
              <HugeiconsIcon icon={Calendar03Icon} size={18} strokeWidth={2} className="text-brand-500 mt-0.5" />
              <div>
                <h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight">Revision schedule</h2>
                {startISO && <p className="text-[11px] text-[var(--muted)] mt-0.5">Started {fullDate(startISO)}</p>}
              </div>
            </div>
            {editingSchedule ? (
              <button type="button" onClick={() => setEditingSchedule(false)} className="text-[11px] font-bold text-[var(--muted)]">Cancel</button>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-alt)] text-[var(--slate-txt)] uppercase tracking-wide">
                  {topic.schedule_type || 'standard'}
                </span>
                <button type="button" onClick={startEditSchedule} className="text-[11px] font-bold text-brand-500">Edit</button>
                <button
                  type="button"
                  onClick={() => setScheduleCollapsed(v => !v)}
                  aria-label={scheduleCollapsed ? 'Expand schedule' : 'Collapse schedule'}
                  className="text-[var(--muted)] active:scale-90 transition-transform"
                >
                  <HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={2.2} className={`transition-transform ${scheduleCollapsed ? 'rotate-180' : ''}`} />
                </button>
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
                <p className="text-[11px] text-[var(--muted)]">{scheduleSummary(student?.exam_date)}</p>
              )}

              {schedType === 'custom' && (
                <div>
                  {customOffsets.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {customOffsets.map(days => (
                        <span key={days} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-[12px] font-bold border-2 border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]">
                          {labelForOffset(days).replace('_', ' ')}
                          <button type="button" onClick={() => setCustomOffsets(customOffsets.filter(d => d !== days))} className="text-brand-500 inline-flex items-center" aria-label={`Remove ${days} day offset`}><HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2.5} /></button>
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
          ) : !scheduleCollapsed && (
            <>
              <div className="mt-1">
                {revisions.map((r, idx) => {
                  const st = revStatus(r)
                  const s = REV_STYLE[st]
                  const isLast = idx === revisions.length - 1
                  const days = intervalToDays(r.interval_label)
                  const actionable = st === 'ready' || st === 'overdue'
                  const quality = r.completed && r.recall_quality ? QUALITY[r.recall_quality] : null
                  const content = (
                    <div className={`flex items-start justify-between gap-2 ${isLast ? '' : 'pb-5'}`}>
                      <div>
                        <p className="text-[11px] font-bold text-brand-500">Revision {idx + 1}</p>
                        <p className="text-[15px] font-bold text-[var(--ink)] leading-tight">{dayMonth(r.scheduled_date)}</p>
                        <p className="text-[11px] text-[var(--muted)]">{days === 0 ? 'Same day' : `Day ${days}`}</p>
                        {quality && (
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${quality.cls}`}>{quality.emoji} {quality.label}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.chip}`}>{s.label}</span>
                        {actionable && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-brand-500">Revise <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2.5} /></span>
                        )}
                      </div>
                    </div>
                  )
                  return (
                    <div key={r.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3.5 h-3.5 rounded-full ring-4 ring-[var(--card)] ${s.dot}`} />
                        {!isLast && <div className="w-0.5 flex-1 bg-[var(--card-alt)]" />}
                      </div>
                      {actionable
                        ? <Link to={`/revise/${r.id}`} className="flex-1 active:opacity-70 transition-opacity">{content}</Link>
                        : <div className="flex-1">{content}</div>}
                    </div>
                  )
                })}
              </div>

              {/* Status legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-[var(--border)]">
                {Object.values(REV_STYLE).map(s => (
                  <span key={s.label} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)]">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Cards / Journal */}
        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <div className="flex p-1 rounded-2xl bg-[var(--card-alt)] mb-4">
            {[['cards', 'Cards', recallCards.length], ['journal', 'Journal', journalEntries.length]].map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => setContentTab(key)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors ${
                  contentTab === key ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)]'
                }`}
              >
                {label} <span className="text-[var(--muted)] font-semibold">({n})</span>
              </button>
            ))}
          </div>

          {contentTab === 'cards' ? (
            <>
              {recallCards.length === 0 && (
                <p className="text-[12px] text-[var(--muted)] mb-3">No recall cards yet — add a short question you want to test yourself on.</p>
              )}
              <div className="space-y-2 mb-3">
                {recallCards.map(card => (
                  editCardId === card.id ? (
                    <div key={card.id} className="bg-[var(--card-alt)] rounded-2xl p-3 space-y-2">
                      <input value={editCardQ} onChange={(e) => setEditCardQ(e.target.value)} placeholder="Question" className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <input value={editCardA} onChange={(e) => setEditCardA(e.target.value)} placeholder="Answer" className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <div className="flex gap-2">
                        <button onClick={() => setEditCardId(null)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[12px] font-bold text-[var(--muted)] active:scale-[0.97] transition-transform">Cancel</button>
                        <button onClick={saveEditCard} className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold active:scale-[0.97] transition-transform">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div key={card.id} className="bg-[var(--card-alt)] rounded-2xl p-3 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[var(--ink)] break-words">{card.question}</p>
                        <p className="text-[13px] text-[var(--slate-txt)] mt-0.5 break-words">{card.answer}</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => startEditCard(card)} aria-label="Edit card" className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] active:bg-[var(--card)] active:scale-90 transition"><HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} /></button>
                        <button onClick={() => deleteCard(card)} aria-label="Delete card" className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 active:bg-red-500/10 active:scale-90 transition"><HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} /></button>
                      </div>
                    </div>
                  )
                ))}
              </div>
              <form onSubmit={addRecallCard} className="space-y-2">
                <input type="text" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
                <input type="text" placeholder="Answer" value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
                <button type="submit" disabled={savingCard} className="w-full py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform">
                  {savingCard ? 'Adding...' : '+ Add recall card'}
                </button>
              </form>
            </>
          ) : (
            <>
              {journalEntries.length === 0 && (
                <p className="text-[12px] text-[var(--muted)] mb-3">Note mistakes, difficult concepts, or things to revisit here.</p>
              )}
              <div className="space-y-2 mb-3">
                {journalEntries.map(entry => (
                  editEntryId === entry.id ? (
                    <div key={entry.id} className="bg-[var(--card-alt)] rounded-2xl p-3 space-y-2">
                      <textarea value={editEntryText} onChange={(e) => setEditEntryText(e.target.value)} rows={2} className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <div className="flex gap-2">
                        <button onClick={() => setEditEntryId(null)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[12px] font-bold text-[var(--muted)] active:scale-[0.97] transition-transform">Cancel</button>
                        <button onClick={saveEditEntry} className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold active:scale-[0.97] transition-transform">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div key={entry.id} className="bg-[var(--card-alt)] rounded-2xl p-3 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[var(--slate-txt)] break-words">{entry.entry}</p>
                        <p className="text-[10px] text-[var(--muted)] mt-1">{new Date(entry.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => startEditEntry(entry)} aria-label="Edit entry" className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] active:bg-[var(--card)] active:scale-90 transition"><HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} /></button>
                        <button onClick={() => deleteEntry(entry)} aria-label="Delete entry" className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 active:bg-red-500/10 active:scale-90 transition"><HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} /></button>
                      </div>
                    </div>
                  )
                ))}
              </div>
              <form onSubmit={addJournalEntry} className="space-y-2">
                <textarea placeholder="Write a note..." value={journalText} onChange={(e) => setJournalText(e.target.value)} rows={2} className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-[12px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors" />
                <button type="submit" disabled={savingJournal} className="w-full py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform">
                  {savingJournal ? 'Adding...' : '+ Add journal entry'}
                </button>
              </form>
            </>
          )}
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
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-95 transition-transform"
              style={{ top: 'max(16px, env(safe-area-inset-top))' }}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2.2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div></AppShell>
  )
}
