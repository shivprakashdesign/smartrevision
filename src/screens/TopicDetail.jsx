import { useEffect, useState } from 'react'
import AppShell from '../lib/AppShell'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

export default function TopicDetail() {
  const { id } = useParams()
  const [topic, setTopic] = useState(null)
  const [recallCards, setRecallCards] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [savingCard, setSavingCard] = useState(false)

  const [journalText, setJournalText] = useState('')
  const [savingJournal, setSavingJournal] = useState(false)

  useEffect(() => {
    loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    const [{ data: t }, { data: cards }, { data: entries }, { data: revs }] = await Promise.all([
      supabase.from('topics').select('*').eq('id', id).single(),
      supabase.from('recall_cards').select('*').eq('topic_id', id).order('id'),
      supabase.from('journal_entries').select('*').eq('topic_id', id).order('created_at', { ascending: false }),
      supabase.from('revisions').select('*').eq('topic_id', id).order('scheduled_date', { ascending: true })
    ])
    setTopic(t)
    setRecallCards(cards || [])
    setJournalEntries(entries || [])
    setRevisions(revs || [])
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
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--slate-txt)]">
              {topic.familiarity?.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--slate-txt)]">
              {topic.priority} priority
            </span>
          </div>
          {topic.notes && <p className="text-[14px] text-[var(--slate-txt)] mt-3">{topic.notes}</p>}
        </motion.div>

        <motion.div
          initial="hidden" animate="show" variants={cardVariants}
          transition={{ duration: 0.25, delay: 0.025, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[var(--card)] rounded-3xl p-5 border border-[var(--border)] shadow-sm"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[13px] font-bold text-[var(--ink)]">Schedule</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-[var(--slate-txt)] uppercase tracking-wide">
              {topic.schedule_type || 'standard'}
            </span>
          </div>

          {revisions.length === 0 ? (
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
              className="w-full py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
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
              className="w-full py-2 rounded-xl bg-brand-500 text-white text-[12px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {savingJournal ? 'Adding...' : '+ Add journal entry'}
            </button>
          </form>
        </motion.div>

      </div>
    </div></AppShell>
  )
}
