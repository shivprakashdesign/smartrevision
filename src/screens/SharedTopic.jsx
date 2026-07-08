import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import AppShell from '../lib/AppShell'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useStudentProfile } from '../lib/useStudentProfile'
import { cloneSharedTopic } from '../lib/sharing'

export default function SharedTopic() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { student } = useStudentProfile()

  const [topic, setTopic] = useState(null)
  const [images, setImages] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: t } = await supabase.from('topics').select('*').eq('share_token', token).eq('shared', true).single()
      if (!active) return
      if (!t) { setTopic(null); setLoading(false); return }
      const [{ data: imgs }, { data: rc }] = await Promise.all([
        supabase.from('topic_images').select('*').eq('topic_id', t.id).order('created_at'),
        supabase.from('recall_cards').select('*').eq('topic_id', t.id).order('id')
      ])
      if (!active) return
      setTopic(t)
      setImages(imgs || [])
      setCards(rc || [])
      setLoading(false)
    })()
    return () => { active = false }
  }, [token])

  async function handleSave() {
    // Not signed in yet → remember what to clone (and who referred them),
    // then send them to sign up. The clone runs once their profile exists.
    if (!user) {
      localStorage.setItem('sr_pending_share', token)
      if (ref) localStorage.setItem('sr_pending_ref', ref)
      navigate('/login')
      return
    }
    if (!student) { toast.error('Still setting up your profile — try again in a second'); return }
    setSaving(true)
    const newId = await cloneSharedTopic(token, student.id)
    setSaving(false)
    if (!newId) { toast.error('Could not save this topic'); return }
    toast.success('Saved to your revisions 🎉')
    navigate(`/topic/${newId}`)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)] font-sans text-sm">Loading...</div>

  if (!topic) {
    return (
      <AppShell><div className="px-6 py-16 flex flex-col items-center text-center">
        <div className="w-full max-w-sm">
          <p className="text-3xl mb-2">🔗</p>
          <h1 className="text-[18px] font-bold text-[var(--ink)]">This topic isn't available</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1 mb-5">The link may be wrong or the owner made it private.</p>
          <button onClick={() => navigate('/login')} className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform">
            Get SmartRevision
          </button>
        </div>
      </div></AppShell>
    )
  }

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="text-center">
          <p className="text-[15px] font-bold text-brand-500 tracking-tight">SmartRevision</p>
          <p className="text-[12px] text-[var(--muted)]">Shared revision topic</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <h1 className="text-[20px] font-bold text-[var(--ink)] tracking-tight">{topic.topic_name}</h1>
          <p className="text-[13px] text-[var(--muted)] mt-1">{topic.subject}</p>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {images.map(img => (
                <button key={img.id} type="button" onClick={() => setLightbox(img.image_url)} className="block w-20 h-20 rounded-xl overflow-hidden border border-[var(--border)] active:scale-[0.97] transition-transform">
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {topic.notes && <p className="text-[14px] text-[var(--slate-txt)] mt-3">{topic.notes}</p>}
        </motion.div>

        {cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
          >
            <h2 className="text-[13px] font-bold text-[var(--ink)] mb-3">Recall cards</h2>
            <div className="space-y-2">
              {cards.map(card => (
                <div key={card.id} className="bg-[var(--card-alt)] rounded-2xl p-3">
                  <p className="text-[12px] font-bold text-[var(--slate-txt)]">Q: {card.question}</p>
                  <p className="text-[12px] text-[var(--slate-txt)] mt-1">A: {card.answer}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="bg-[rgba(37,99,235,0.08)] rounded-3xl p-5 text-center">
          <p className="text-[14px] font-bold text-[var(--ink)]">Want to actually remember this?</p>
          <p className="text-[12px] text-[var(--muted)] mt-1 mb-3">SmartRevision reminds you to revise at the right moments so it sticks — free.</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {saving ? 'Saving…' : (user ? 'Save to my revisions' : 'Save & start free')}
          </button>
        </div>
      </div>

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
              key={lightbox} src={lightbox} alt=""
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div></AppShell>
  )
}
