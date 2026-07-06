import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { THEME_COLORS } from './theme'

const ThemeContext = createContext(null)

function applyThemeVars(themeId) {
  const t = THEME_COLORS[themeId] || THEME_COLORS.chalk
  const root = document.documentElement
  root.style.setProperty('--bg', t.bg)
  root.style.setProperty('--card', t.card)
  root.style.setProperty('--card-alt', t.cardAlt)
  root.style.setProperty('--ink', t.ink)
  root.style.setProperty('--slate-txt', t.slate)
  root.style.setProperty('--muted', t.muted)
  root.style.setProperty('--border', t.border)
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState('chalk')

  useEffect(() => {
    applyThemeVars(theme)
  }, [theme])

  useEffect(() => {
    if (!user) return
    supabase.from('accounts').select('theme').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.theme) setThemeState(data.theme)
      })
  }, [user])

  async function setTheme(id) {
    setThemeState(id)
    if (user) {
      await supabase.from('accounts').update({ theme: id }).eq('id', user.id)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
