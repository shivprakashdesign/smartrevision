import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, PencilEdit02Icon, Delete02Icon, Alert02Icon } from '@hugeicons/core-free-icons'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useStudentProfile } from '../lib/useStudentProfile'
import {
  subjectColor, colorClassForKey, SUBJECT_SWATCHES, setSubjectColorOverrides
} from '../lib/subjects'

// Build the derived subject list from a student's topics: a subject only
// exists because topics carry its name. Count topics per subject, drop the
// empty/"General" fallback (there's no real subject to manage there).
function deriveSubjects(topics) {
  const counts = new Map()
  for (const t of topics) {
    const s = (t.subject || '').trim()
    if (!s || s === 'General') continue
    counts.set(s, (counts.get(s) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export default function ManageSubjects() {
  const { student, refreshStudent } = useStudentProfile()
  const [topics, setTopics] = useState([])
  const [colors, setColors] = useState({})
  const [loading, setLoading] = useState(true)
  const [paletteFor, setPaletteFor] = useState(null)   // subject whose swatches are open
  const [renaming, setRenaming] = useState(null)       // { from, value }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!student) return
    setColors(student.subject_colors || {})
    supabase
      .from('topics')
      .select('id, subject')
      .eq('student_id', student.id)
      .then(({ data }) => { setTopics(data || []); setLoading(false) })
  }, [student])

  const subjects = useMemo(() => deriveSubjects(topics), [topics])

  // Persist the colour map, update local state + the app-wide overrides so
  // pills recolour instantly everywhere, and keep the cached student in sync.
  async function saveColors(next) {
    setColors(next)
    setSubjectColorOverrides(next)
    await supabase.from('students').update({ subject_colors: next }).eq('id', student.id)
    refreshStudent()
  }

  async function recolor(name, key) {
    setPaletteFor(null)
    await saveColors({ ...colors, [name]: key })
  }

  async function submitRename() {
    const from = renaming.from
    const to = renaming.value.trim()
    setRenaming(null)
    if (!to || to === from) return
    const merging = subjects.some(s => s.name.toLowerCase() === to.toLowerCase() && s.name !== from)

    const { error } = await supabase
      .from('topics')
      .update({ subject: to })
      .eq('student_id', student.id)
      .eq('subject', from)
    if (error) { toast.error(error.message); return }

    // Carry the colour override across the rename (don't clobber the target's).
    if (colors[from]) {
      const next = { ...colors }
      if (!next[to]) next[to] = next[from]
      delete next[from]
      await saveColors(next)
    }
    setTopics(prev => prev.map(t => (t.subject === from ? { ...t, subject: to } : t)))
    toast.success(merging ? `Merged into ${to}` : `Renamed to ${to}`)
  }

  async function confirmDelete() {
    const name = deleteTarget.name
    setBusy(true)
    const ids = topics.filter(t => t.subject === name).map(t => t.id)

    if (ids.length) {
      // Best-effort: strip attached photos from storage before dropping rows.
      const { data: imgs } = await supabase.from('topic_images').select('image_url').in('topic_id', ids)
      const marker = '/topic-images/'
      const paths = (imgs || [])
        .map(im => { const at = im.image_url.indexOf(marker); return at >= 0 ? decodeURIComponent(im.image_url.slice(at + marker.length)) : null })
        .filter(Boolean)
      if (paths.length) await supabase.storage.from('topic-images').remove(paths)

      // Delete children then the topics — works whether or not the cascade
      // migration has been applied.
      await supabase.from('topic_images').delete().in('topic_id', ids)
      await supabase.from('recall_cards').delete().in('topic_id', ids)
      await supabase.from('journal_entries').delete().in('topic_id', ids)
      await supabase.from('revisions').delete().in('topic_id', ids)
      const { error } = await supabase.from('topics').delete().in('id', ids)
      if (error) { setBusy(false); toast.error(error.message); return }
    }

    if (colors[name]) {
      const next = { ...colors }
      delete next[name]
      await saveColors(next)
    }
    setTopics(prev => prev.filter(t => t.subject !== name))
    setBusy(false)
    setDeleteTarget(null)
    toast.success(`Deleted ${name}`)
  }

  return (
    <AppShell><div className="px-5 pt-6 pb-10">
      <div className="max-w-sm mx-auto">
        <Link to="/settings" className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--muted)] active:opacity-70 transition-opacity mb-4">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} /> Settings
        </Link>
        <h1 className="text-[22px] font-bold text-[var(--ink)] tracking-tight">Subjects</h1>
        <p className="text-[14px] text-[var(--muted)] mt-1 mb-5">Recolour, rename, or delete the subjects you file topics under.</p>

        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-3xl bg-[var(--card-alt)] animate-pulse" />)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-[var(--card)] rounded-3xl border border-[var(--border)] py-12 text-center">
            <p className="text-3xl mb-2">🗂️</p>
            <p className="text-[15px] text-[var(--muted)]">No subjects yet. Add a topic and its subject shows up here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {subjects.map((s, i) => {
              const dotClass = colors[s.name] ? colorClassForKey(colors[s.name]) : subjectColor(s.name)
              const open = paletteFor === s.name
              return (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: [0.23, 1, 0.32, 1] }}
                  className="bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setPaletteFor(open ? null : s.name)}
                      aria-label={`Recolour ${s.name}`}
                      className={`w-6 h-6 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-[var(--card)] transition-transform active:scale-90 ${dotClass} ${open ? 'ring-[var(--ink)]' : 'ring-transparent'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-[var(--ink)] truncate">{s.name}</p>
                      <p className="text-[12px] text-[var(--muted)]">{s.count} topic{s.count === 1 ? '' : 's'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRenaming({ from: s.name, value: s.name })}
                      aria-label={`Rename ${s.name}`}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--slate-txt)] active:bg-[var(--card-alt)] transition-colors"
                    >
                      <HugeiconsIcon icon={PencilEdit02Icon} size={18} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      aria-label={`Delete ${s.name}`}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-red-500 active:bg-red-500/10 transition-colors"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={2} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2.5 px-4 pb-4 pt-0.5">
                          {SUBJECT_SWATCHES.map(sw => {
                            const active = (colors[s.name] || null) === sw.key
                            return (
                              <button
                                key={sw.key}
                                type="button"
                                onClick={() => recolor(s.name, sw.key)}
                                aria-label={sw.key}
                                className={`w-7 h-7 rounded-full ${sw.cls} ring-2 ring-offset-2 ring-offset-[var(--card)] transition-transform active:scale-90 ${active ? 'ring-[var(--ink)]' : 'ring-transparent'}`}
                              />
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rename / merge sheet */}
      <AnimatePresence>
        {renaming && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setRenaming(null)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98, x: '-50%' }} animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }} exit={{ opacity: 0, y: 20, scale: 0.98, x: '-50%' }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="fixed z-50 left-1/2 bottom-6 w-[calc(100%-2.5rem)] max-w-sm bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-lg p-5"
            >
              <h2 className="text-[17px] font-bold text-[var(--ink)] mb-1">Rename subject</h2>
              <p className="text-[13px] text-[var(--muted)] mb-4">Renaming to an existing subject merges the two.</p>
              <input
                autoFocus
                value={renaming.value}
                onChange={e => setRenaming(r => ({ ...r, value: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && submitRename()}
                className="w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-[15px] text-[var(--ink)] bg-[var(--card-alt)] mb-4"
              />
              <div className="flex gap-2.5">
                <button onClick={() => setRenaming(null)} className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-[var(--slate-txt)] bg-[var(--card-alt)] active:scale-[0.98] transition-transform">Cancel</button>
                <button onClick={submitRename} className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-white bg-brand-500 active:scale-[0.98] transition-transform">Save</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => !busy && setDeleteTarget(null)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98, x: '-50%' }} animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }} exit={{ opacity: 0, y: 20, scale: 0.98, x: '-50%' }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="fixed z-50 left-1/2 bottom-6 w-[calc(100%-2.5rem)] max-w-sm bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-lg p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <HugeiconsIcon icon={Alert02Icon} size={22} strokeWidth={2} className="text-red-500" />
                <h2 className="text-[17px] font-bold text-[var(--ink)]">Delete {deleteTarget.name}?</h2>
              </div>
              <p className="text-[13px] text-[var(--muted)] mb-4">
                This permanently deletes {deleteTarget.count} topic{deleteTarget.count === 1 ? '' : 's'} and all their revision history. This can't be undone.
              </p>
              <div className="flex gap-2.5">
                <button disabled={busy} onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-[var(--slate-txt)] bg-[var(--card-alt)] active:scale-[0.98] transition-transform disabled:opacity-50">Cancel</button>
                <button disabled={busy} onClick={confirmDelete} className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-white bg-red-500 active:scale-[0.98] transition-transform disabled:opacity-50">
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div></AppShell>
  )
}
