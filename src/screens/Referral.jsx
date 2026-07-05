import { useEffect, useState } from 'react'
import AppShell from '../lib/AppShell'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Referral() {
  const { user } = useAuth()
  const [account, setAccount] = useState(null)
  const [enteredCode, setEnteredCode] = useState('')
  const [friendCount, setFriendCount] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadAccount()
  }, [user])

  async function loadAccount() {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', user.id)
      .single()
    setAccount(data)

    const { count } = await supabase
      .from('referral_events')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_account_id', user.id)
      .eq('reward_granted', true)

    setFriendCount(count || 0)
    setLoading(false)
  }

  async function shareCode() {
    const text = `Join me on SmartRevision! Use my code ${account.referral_code} when you sign up 🎓`

    if (Capacitor.isNativePlatform()) {
      await Share.share({ title: 'SmartRevision', text })
    } else if (navigator.share) {
      await navigator.share({ title: 'SmartRevision', text })
    } else {
      await navigator.clipboard.writeText(text)
      setMessage('Copied to clipboard!')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  async function submitCode(e) {
    e.preventDefault()
    if (!enteredCode.trim()) return

    const code = enteredCode.trim().toUpperCase()

    const { data: referrerId, error: lookupError } = await supabase
      .rpc('find_account_by_referral_code', { code })

    if (lookupError || !referrerId) {
      setMessage('Code not found')
      return
    }

    if (referrerId === user.id) {
      setMessage("You can't refer yourself")
      return
    }

    await supabase.from('accounts').update({ referred_by_code: code }).eq('id', user.id)

    const { error: insertError } = await supabase.from('referral_events').insert({
      referrer_account_id: referrerId,
      referred_account_id: user.id,
      reward_granted: false
    })

    if (insertError) {
      setMessage('Something went wrong applying the code')
      console.error(insertError)
      return
    }

    setMessage('Code applied! Reward unlocks once you complete your first revision.')
    setEnteredCode('')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-sans text-sm">Loading...</div>

  return (
    <AppShell><div className="px-5 py-8">
      <div className="max-w-sm mx-auto">
        <Link to="/home" className="text-[12px] font-bold text-slate-400">← Back to Home</Link>
        <h1 className="text-[20px] font-bold text-brand-900 tracking-tight mt-2 mb-1">Refer a friend</h1>
        <p className="text-[14px] text-slate-400 mb-6">
          When your friend completes their first revision, you both get rewarded.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-brand-50 rounded-3xl p-6 text-center mb-4"
        >
          <p className="text-[12px] text-slate-400 mb-1">Your code</p>
          <p className="text-[26px] font-bold tracking-widest text-brand-600">
            {account?.referral_code}
          </p>
        </motion.div>

        <button
          onClick={shareCode}
          className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] mb-3 active:scale-[0.98] transition-transform"
        >
          Share my code
        </button>

        {friendCount > 0 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-[13px] text-slate-500 mb-4"
          >
            🎉 {friendCount} friend{friendCount > 1 ? 's' : ''} joined
          </motion.p>
        )}

        {!account?.referred_by_code && (
          <form onSubmit={submitCode} className="mt-4">
            <input
              type="text"
              placeholder="Enter a friend's code"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] text-center bg-white uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-2xl border-2 border-slate-200 text-[13px] font-bold text-slate-600 active:scale-[0.98] transition-transform"
            >
              Apply code
            </button>
          </form>
        )}

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center text-[12px] text-brand-600 mt-3"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div></AppShell>
  )
}
