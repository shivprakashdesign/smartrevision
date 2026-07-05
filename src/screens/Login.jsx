import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signup')
  const [accountType, setAccountType] = useState('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('accounts').insert({
      id: data.user.id,
      account_type: accountType,
      name: name
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    navigate(accountType === 'parent' ? '/profiles' : '/home')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: accountRow } = await supabase
      .from('accounts')
      .select('account_type')
      .eq('id', data.user.id)
      .single()

    navigate(accountRow?.account_type === 'parent' ? '/profiles' : '/home')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8"
      >
        <h1 className="text-[22px] font-bold text-brand-900 tracking-tight mb-1">SmartRevision</h1>
        <p className="text-[13px] text-slate-400 mb-6">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </p>

        <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAccountType('student')}
                  className={`flex-1 py-2.5 rounded-2xl text-[13px] font-bold border-2 transition-colors ${
                    accountType === 'student' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-400'
                  }`}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('parent')}
                  className={`flex-1 py-2.5 rounded-2xl text-[13px] font-bold border-2 transition-colors ${
                    accountType === 'parent' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-400'
                  }`}
                >
                  👨‍👩‍👧 Parent
                </button>
              </div>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
          />

          {error && <p className="text-red-500 text-[12px]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-[12px] text-slate-400 mt-4">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-brand-500 font-bold"
          >
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
