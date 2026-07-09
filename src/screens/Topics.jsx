import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  MoreHorizontalIcon, Archive02Icon, Delete02Icon, InboxIcon,
  ArrowUp01Icon, PlusSignIcon, BookOpen01Icon, Search01Icon, Cancel01Icon,
  UnfoldLessIcon, UnfoldMoreIcon, ArrowUpDownIcon, Tick02Icon
} from '@hugeicons/core-free-icons'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import AppShell from '../lib/AppShell'
import { completion, computeMemory, topicBucket, nextRevision } from '../lib/metrics'

const BUCKET_STYLE = {
  due: { label: 'Due today', cls: 'text-emerald-600 bg-emerald-500/12' },
  missed: { label: 'Missed', cls: 'text-red-500 bg-red-500/12' },
  upcoming: { label: 'Upcoming', cls: 'text-[var(--slate-txt)] bg-[var(--card-alt)]' },
  done: { label: 'Complete', cls: 'text-brand-500 bg-brand-500/12' }
}

const memTone = (m) =>
  m == null ? 'text-[var(--muted)]'
    : m >= 67 ? 'text-emerald-600'
    : m >= 40 ? 'text-amber-600'
    : 'text-red-500'

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

// Group a flat topic list into { subject, topics[] } sections, subjects A→Z.
function groupBySubject(list) {
  const map = {}
  for (const t of list) (map[t.subject || 'General'] ??= []).push(t)
  return Object.keys(map).sort((a, b) => a.localeCompare(b)).map(subject => ({ subject, topics: map[subject] }))
}

// Deterministic pill colour per subject so groups are visually distinct and
// stable across sessions. "General" (the no-subject fallback) reads neutral.
const SUBJECT_COLORS = [
  'bg-emerald-600', 'bg-sky-600', 'bg-violet-600', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-600', 'bg-teal-600', 'bg-fuchsia-600'
]
function subjectColor(name) {
  if (!name || name === 'General') return 'bg-slate-500'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return SUBJECT_COLORS[h % SUBJECT_COLORS.length]
}

// Average completion across a subject's topics — the group-header progress bar.
function subjectProgress(topics) {
  if (!topics.length) return 0
  return Math.round(topics.reduce((s, t) => s + completion(t.revisions || []).pct, 0) / topics.length)
}

// Sort options for the cards within each subject group.
const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently added' },
  { key: 'due', label: 'Due first' },
  { key: 'progress', label: 'Least progress' },
  { key: 'az', label: 'A–Z' }
]
const BUCKET_RANK = { missed: 0, due: 1, upcoming: 2, done: 3 }
function sortTopics(list, key) {
  const arr = [...list]
  if (key === 'az') {
    arr.sort((a, b) => (a.topic_name || '').localeCompare(b.topic_name || ''))
  } else if (key === 'progress') {
    arr.sort((a, b) => completion(a.revisions || []).pct - completion(b.revisions || []).pct)
  } else if (key === 'due') {
    arr.sort((a, b) => {
      const r = BUCKET_RANK[topicBucket(a.revisions || [])] - BUCKET_RANK[topicBucket(b.revisions || [])]
      if (r !== 0) return r
      const na = nextRevision(a.revisions || []), nb = nextRevision(b.revisions || [])
      if (na && nb) return na.scheduled_date < nb.scheduled_date ? -1 : 1
      return 0
    })
  }
  // 'recent' keeps the incoming order (fetch is created_at desc).
  return arr
}

function TopicCard({ topic, i, onMenu }) {
  const revs = topic.revisions || []
  const { pct } = completion(revs)
  const memory = computeMemory(revs)
  const bucket = topicBucket(revs)
  const b = BUCKET_STYLE[bucket]
  const next = nextRevision(revs)

  return (
    <div
      className="relative bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm animate-enter"
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <Link to={`/topic/${topic.id}`} className="block p-4 pr-11 active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[15px] font-bold text-[var(--ink)] leading-tight truncate">{topic.topic_name}</span>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--card-alt)] overflow-hidden mb-2">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-x-2.5 text-[11px] font-bold">
          <span className="text-[var(--muted)]">{pct}% <span className="font-semibold">done</span></span>
          <span className={memTone(memory)}>{memory == null ? 'New' : `${memory}%`} <span className="text-[var(--muted)] font-semibold">memory</span></span>
          {next && bucket !== 'done' && (
            <span className="ml-auto text-[var(--muted)] font-semibold">Next {shortDate(next.scheduled_date)}</span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onMenu(topic)}
        aria-label="Topic actions"
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] active:bg-[var(--card-alt)] active:scale-90 transition"
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} strokeWidth={2} />
      </button>
    </div>
  )
}

export default function Topics() {
  const { student, loading: studentLoading } = useStudentProfile()
  const navigate = useNavigate()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('active') // 'active' | 'archived'
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [sortOpen, setSortOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [menuTopic, setMenuTopic] = useState(null)   // topic whose action sheet is open
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!student) return
    supabase
      .from('topics')
      .select('id, subject, topic_name, archived, revisions(id, scheduled_date, interval_label, completed, completed_at, recall_quality)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setTopics(data || [])
        setLoading(false)
      })
  }, [student])

  const activeTopics = useMemo(() => topics.filter(t => !t.archived), [topics])
  const archivedTopics = useMemo(() => topics.filter(t => t.archived), [topics])

  // The Archived tab only exists while something is archived. If the last
  // archived topic is restored/deleted while viewing it, fall back to Active
  // so the user isn't stranded on a tab with no way back.
  useEffect(() => {
    if (view === 'archived' && archivedTopics.length === 0) setView('active')
  }, [view, archivedTopics.length])

  const viewList = view === 'archived' ? archivedTopics : activeTopics

  // Drop collapsed entries for subjects that no longer exist (e.g. after the
  // last topic in a subject is deleted) so the set doesn't accumulate stale keys.
  useEffect(() => {
    const subjects = new Set(topics.map(t => t.subject || 'General'))
    setCollapsed(prev => {
      const kept = [...prev].filter(s => subjects.has(s))
      return kept.length === prev.size ? prev : new Set(kept)
    })
  }, [topics])

  const q = query.trim().toLowerCase()
  const list = useMemo(() => {
    if (!q) return viewList
    return viewList.filter(t =>
      (t.topic_name || '').toLowerCase().includes(q) ||
      (t.subject || 'General').toLowerCase().includes(q)
    )
  }, [viewList, q])
  const groups = useMemo(() => groupBySubject(list), [list])

  function toggleSubject(subject) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(subject) ? next.delete(subject) : next.add(subject)
      return next
    })
  }

  const allCollapsed = groups.length > 0 && groups.every(g => collapsed.has(g.subject))
  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map(g => g.subject)))
  }

  async function setArchived(topic, archived) {
    setMenuTopic(null)
    // Optimistic: flip locally first.
    setTopics(prev => prev.map(t => (t.id === topic.id ? { ...t, archived } : t)))
    const { error } = await supabase.from('topics').update({ archived }).eq('id', topic.id)
    if (error) {
      setTopics(prev => prev.map(t => (t.id === topic.id ? { ...t, archived: !archived } : t)))
      toast.error(error.message)
      return
    }
    toast.success(archived ? 'Topic archived' : 'Topic restored', {
      action: {
        label: 'Undo',
        onClick: () => setArchived(topic, !archived)
      }
    })
  }

  async function confirmDelete() {
    const topic = deleteTarget
    if (!topic) return
    setBusy(true)

    // Best-effort: remove attached photos from storage before dropping the rows.
    const { data: imgs } = await supabase.from('topic_images').select('image_url').eq('topic_id', topic.id)
    const marker = '/topic-images/'
    const paths = (imgs || [])
      .map(im => { const at = im.image_url.indexOf(marker); return at >= 0 ? decodeURIComponent(im.image_url.slice(at + marker.length)) : null })
      .filter(Boolean)
    if (paths.length) await supabase.storage.from('topic-images').remove(paths)

    // Delete children then the topic — works whether or not the DB cascade
    // migration has been applied.
    await supabase.from('topic_images').delete().eq('topic_id', topic.id)
    await supabase.from('recall_cards').delete().eq('topic_id', topic.id)
    await supabase.from('journal_entries').delete().eq('topic_id', topic.id)
    await supabase.from('revisions').delete().eq('topic_id', topic.id)
    const { error } = await supabase.from('topics').delete().eq('id', topic.id)

    setBusy(false)
    if (error) { toast.error(error.message); return }
    setTopics(prev => prev.filter(t => t.id !== topic.id))
    setDeleteTarget(null)
    toast.success('Topic deleted')
  }

  if (studentLoading || loading) {
    return <AppShell nav><div className="px-5 pt-6"><div className="max-w-sm mx-auto space-y-3">
      {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-3xl bg-[var(--card-alt)] animate-pulse" />)}
    </div></div></AppShell>
  }

  const showTabs = archivedTopics.length > 0

  return (
    <AppShell nav><div className="px-5 pt-6 pb-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[26px] font-bold text-[var(--ink)] tracking-tight leading-none">Topics</h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              {activeTopics.length} active{archivedTopics.length ? ` · ${archivedTopics.length} archived` : ''}
            </p>
          </div>
          <Link to="/add-topic" className="inline-flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-brand-500 text-white text-[13px] font-bold active:scale-95 transition-transform">
            <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={2.5} /> Add
          </Link>
        </div>

        {topics.length > 0 && (
          <div className="relative mb-4">
            <HugeiconsIcon
              icon={Search01Icon}
              size={17}
              strokeWidth={2}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics"
              aria-label="Search topics"
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[var(--card-alt)] text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[var(--muted)] active:bg-[var(--card)] active:scale-90 transition"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2.2} />
              </button>
            )}
          </div>
        )}

        {showTabs && (
          <div className="flex p-1 rounded-2xl bg-[var(--card-alt)] mb-5">
            {[['active', 'Active', activeTopics.length], ['archived', 'Archived', archivedTopics.length]].map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-colors ${
                  view === key ? 'bg-[var(--card)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)]'
                }`}
              >
                {label} <span className="text-[var(--muted)] font-semibold">{n}</span>
              </button>
            ))}
          </div>
        )}

        {list.length === 0 ? (
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] py-12 text-center">
            <p className="text-3xl mb-2">{q ? '🔍' : view === 'archived' ? '🗂️' : '📚'}</p>
            <p className="text-[15px] text-[var(--muted)]">
              {q ? `No topics match “${query.trim()}”`
                : view === 'archived' ? 'Nothing archived'
                : archivedTopics.length ? 'No active topics' : 'No topics yet'}
            </p>
            {!q && view !== 'archived' && (
              <Link to="/add-topic" className="inline-block mt-4 text-[13px] font-bold text-brand-500">
                {archivedTopics.length ? '+ Add a topic' : '+ Add your first topic'}
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen(v => !v)}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-[var(--card-alt)] text-[12px] font-bold text-[var(--slate-txt)] active:scale-95 transition-transform"
                >
                  <HugeiconsIcon icon={ArrowUpDownIcon} size={14} strokeWidth={2} />
                  {SORT_OPTIONS.find(o => o.key === sort)?.label}
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute z-50 top-10 left-0 w-44 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-1.5"
                        style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.16)' }}
                      >
                        {SORT_OPTIONS.map(o => (
                          <button
                            key={o.key}
                            onClick={() => { setSort(o.key); setSortOpen(false) }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] font-bold text-[var(--slate-txt)] active:bg-[var(--card-alt)] transition-colors"
                          >
                            {o.label}
                            {sort === o.key && <HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2.5} className="text-brand-500" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {!q && groups.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-500 px-1 active:opacity-70 transition-opacity"
                >
                  <HugeiconsIcon icon={allCollapsed ? UnfoldMoreIcon : UnfoldLessIcon} size={15} strokeWidth={2} />
                  {allCollapsed ? 'Expand all' : 'Collapse all'}
                </button>
              )}
            </div>
            {groups.map(({ subject, topics: subjectTopics }) => {
              const isCollapsed = collapsed.has(subject) && !q
              const dueCount = subjectTopics.filter(t => topicBucket(t.revisions || []) === 'due').length
              const subjPct = subjectProgress(subjectTopics)
              const ordered = sortTopics(subjectTopics, sort)
              return (
                <div key={subject}>
                  <button
                    onClick={() => toggleSubject(subject)}
                    className="w-full flex items-center gap-2 mb-2.5 px-1 active:opacity-70 transition-opacity"
                  >
                    <span className={`text-[12px] font-bold text-white px-2.5 py-1 rounded-full max-w-[140px] truncate ${subjectColor(subject)}`}>{subject}</span>
                    <span className="shrink-0 text-[12px] font-bold text-[var(--muted)]">({subjectTopics.length})</span>
                    {dueCount > 0 && view === 'active' && (
                      <span className="shrink-0 text-[10px] font-bold text-emerald-600 px-1.5 py-0.5 rounded-full bg-emerald-500/12">{dueCount} due</span>
                    )}
                    <div className="ml-auto shrink-0 flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-[var(--card-alt)] overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${subjPct}%` }} />
                      </div>
                      <span className="text-[12px] font-bold text-[var(--ink)] w-8 text-right">{subjPct}%</span>
                      <HugeiconsIcon
                        icon={ArrowUp01Icon}
                        size={16}
                        strokeWidth={2.2}
                        className={`text-[var(--muted)] transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2.5">
                          {ordered.map((t, i) => (
                            <TopicCard key={t.id} topic={t} i={i} onMenu={setMenuTopic} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Per-topic action sheet */}
      <AnimatePresence>
        {menuTopic && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMenuTopic(null)}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 28 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-[28px] sm:rounded-3xl border border-[var(--border)] shadow-lg bg-[var(--card)] p-3"
              style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
            >
              <div className="px-3 py-2">
                <p className="text-[15px] font-bold text-[var(--ink)] truncate">{menuTopic.topic_name}</p>
                <p className="text-[12px] text-[var(--muted)]">{menuTopic.subject || 'General'}</p>
              </div>

              <button
                onClick={() => { const t = menuTopic; setMenuTopic(null); navigate(`/topic/${t.id}`) }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-[14px] font-bold text-[var(--slate-txt)] active:bg-[var(--card-alt)] transition-colors"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={18} strokeWidth={2} /> Open topic
              </button>

              <button
                onClick={() => setArchived(menuTopic, !menuTopic.archived)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-[14px] font-bold text-[var(--slate-txt)] active:bg-[var(--card-alt)] transition-colors"
              >
                <HugeiconsIcon icon={menuTopic.archived ? InboxIcon : Archive02Icon} size={18} strokeWidth={2} />
                {menuTopic.archived ? 'Restore to active' : 'Archive topic'}
              </button>

              <button
                onClick={() => { setDeleteTarget(menuTopic); setMenuTopic(null) }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-[14px] font-bold text-red-500 active:bg-red-500/10 transition-colors"
              >
                <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={2} /> Delete topic
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !busy && setDeleteTarget(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-lg p-5"
            >
              <h3 className="text-[15px] font-bold text-[var(--ink)]">Delete “{deleteTarget.topic_name}”?</h3>
              <p className="text-[13px] text-[var(--muted)] mt-1 mb-4">
                This permanently removes the topic, its revisions, recall cards, journal and photos. This can't be undone — archive it instead if you just want it out of the way.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-2xl border-2 border-[var(--border)] text-[13px] font-bold text-[var(--muted)] active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-[13px] font-bold disabled:opacity-50 active:scale-[0.97] transition-transform"
                >
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div></AppShell>
  )
}
