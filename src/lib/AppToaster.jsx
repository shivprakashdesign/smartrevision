import { Toaster } from 'sonner'
import { useTheme } from './ThemeContext'

const DARK_THEMES = ['slate', 'blackboard']

// App-wide toast host. Colors follow the active theme's CSS vars so toasts
// match whichever theme the user has picked, and the top offset clears the
// iOS status bar / notch in standalone PWA mode.
export default function AppToaster() {
  const { theme } = useTheme()
  const mode = DARK_THEMES.includes(theme) ? 'dark' : 'light'

  return (
    <Toaster
      theme={mode}
      position="top-center"
      offset="calc(env(safe-area-inset-top) + 12px)"
      mobileOffset="calc(env(safe-area-inset-top) + 12px)"
      toastOptions={{
        className: 'font-sans',
        style: {
          background: 'var(--card)',
          color: 'var(--ink)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          fontSize: '13px',
          fontWeight: 600
        }
      }}
    />
  )
}
