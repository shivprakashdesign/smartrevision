import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if there's already a logged-in session (e.g. on page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for login/logout events anywhere in the app. Token refreshes and
    // tab-refocus re-emits deliver a NEW session object for the SAME user —
    // keep the old object then, or every `useEffect([user])` in the app
    // refires on refocus (Home re-skeletons, in-progress UI state is lost).
    // The supabase client tracks the fresh token internally either way.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession((prev) => (prev?.user?.id === session?.user?.id ? prev : session))
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}