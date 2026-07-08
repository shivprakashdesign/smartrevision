import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const ProContext = createContext({ isPro: false, loading: true, refresh: () => {} })

export function ProProvider({ children }) {
  const { user } = useAuth()
  const [plan, setPlan] = useState('free')
  const [proUntil, setProUntil] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setPlan('free'); setProUntil(null); setLoading(false); return }
    const { data } = await supabase.from('accounts').select('plan, pro_until').eq('id', user.id).single()
    setPlan(data?.plan || 'free')
    setProUntil(data?.pro_until || null)
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const isPro = plan === 'pro' && (!proUntil || new Date(proUntil) > new Date())

  return (
    <ProContext.Provider value={{ isPro, loading, refresh }}>
      {children}
    </ProContext.Provider>
  )
}

export function usePro() {
  return useContext(ProContext)
}
