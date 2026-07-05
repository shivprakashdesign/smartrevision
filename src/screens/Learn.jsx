import { useState, useRef } from 'react'
import AppShell from '../lib/AppShell'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const LESSONS = [
  {
    id: 'forgetting-curve',
    title: 'The forgetting curve',
    summary: 'Why you lose 60–80% of what you learn within 24 hours',
    content: `Psychologists have shown that the average student forgets 82% of what they study within the first 24 hours. After a month without revision, only about 5% remains.

This is called the forgetting curve — memory decays fastest right after learning, then levels off. The good news: each revision you do resets the curve and lifts your retention back up.

That's the entire idea behind SmartRevision's schedule — same day, then 1 day, 1 week, 1 month, 4 months. Each one catches your memory right before it would have faded.`
  },
  {
    id: 'cumulative-recall',
    title: 'Cumulative recalling technique',
    summary: 'Recall old topics before starting new ones',
    content: `When studying multiple topics in one sitting, don't just move from one to the next. After finishing a topic, spend 1-2 minutes recalling it from memory before starting the next one.

Then, after your second topic, recall both the second AND the first again. Keep stacking this way through your session.

Without this, most students unintentionally practice "cumulative forgetting" — by the time they reach topic 3, they've already lost topics 1 and 2, even though they "studied" all three.`
  },
  {
    id: 'index-recall',
    title: 'Index recalling technique',
    summary: 'Test yourself with just topic titles',
    content: `For fast revision, don't re-read your notes in full. Instead, look only at your list of topics (like a textbook's index) and try to recall everything you know about each one just from the title.

If you get stuck on a topic, peek at your notes for just 15-20 seconds — enough to jog your memory — then close them and continue testing yourself.

This mirrors exactly what happens in an exam: you see a question and have to recall the answer, not re-read it. Practicing this way trains the actual skill you'll need.`
  },
  {
    id: 'continuity',
    title: 'The principle of continuity',
    summary: 'Keep study breaks under 10 minutes',
    content: `Long breaks during study don't stay short. Once you step away for too long, restarting and reconnecting with what you were learning takes real effort — like a car that's stopped needing time to build up speed again.

Try to keep breaks to 10 minutes or less while studying. It's easy for a "quick chat" to turn into an hour gone.

Most people can focus for about 50 minutes before needing a break — harder subjects may need shorter, more frequent ones.`
  }
]

function LessonCard({ lesson, index, isOpen, onToggle }) {
  const contentRef = useRef(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <button onClick={onToggle} className="w-full text-left p-4">
        <p className="font-bold text-[14px] text-brand-900">{lesson.title}</p>
        <p className="text-[12px] text-slate-400 mt-1">{lesson.summary}</p>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? contentRef.current?.scrollHeight ?? 'auto' : 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <div ref={contentRef} className="px-4 pb-4">
          <p className="text-[12px] text-slate-600 whitespace-pre-line leading-relaxed">
            {lesson.content}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Learn() {
  const [openId, setOpenId] = useState(null)

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto">
        <Link to="/home" className="text-[12px] font-bold text-slate-400">← Back to Home</Link>
        <h1 className="text-[20px] font-bold text-brand-900 tracking-tight mt-2 mb-1">Learn</h1>
        <p className="text-[14px] text-slate-400 mb-6">The science behind why SmartRevision works</p>

        <div className="space-y-3">
          {LESSONS.map((lesson, i) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={i}
              isOpen={openId === lesson.id}
              onToggle={() => setOpenId(openId === lesson.id ? null : lesson.id)}
            />
          ))}
        </div>
      </div>
    </div></AppShell>
  )
}
