import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signup')
  const [accountType, setAccountType] = useState('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      toast.error(signUpError.message)
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('accounts').insert({
      id: data.user.id,
      account_type: accountType,
      name: name
    })

    if (insertError) {
      toast.error(insertError.message)
      setLoading(false)
      return
    }

    navigate(accountType === 'parent' ? '/profiles' : '/home')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      toast.error(signInError.message)
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
    <div className="min-h-screen flex items-center justify-center font-sans px-6" style={{ backgroundColor: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-8"
      >
        <h1 className="text-[22px] font-bold text-[var(--ink)] tracking-tight mb-1">SmartRevision</h1>
        <p className="text-[13px] text-[var(--muted)] mb-6">
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
                    accountType === 'student' ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('parent')}
                  className={`flex-1 py-2.5 rounded-2xl text-[13px] font-bold border-2 transition-colors ${
                    accountType === 'parent' ? 'border-brand-500 text-brand-500 bg-[rgba(37,99,235,0.12)]' : 'border-[var(--border)] text-[var(--muted)]'
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
                className="w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--card-alt)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-[var(--card)] transition-colors"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-brand-500 text-white font-bold text-[14px] disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="text-center text-[12px] text-[var(--muted)] mt-4">
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
