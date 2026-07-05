// Wraps every post-login screen with a fixed, viewport-pinned container —
// same fix as onboarding (position:fixed instead of min-h-screen/dvh, which
// are unreliable inside an iOS home-screen standalone app). Content that's
// taller than the screen scrolls WITHIN this box; the box itself never moves
// or leaves phantom empty space.
export default function AppShell({ children, bg = 'bg-slate-50' }) {
  return (
    <div className={`${bg} font-sans`} style={{ position: 'fixed', inset: 0, overflowY: 'auto' }}>
      <div style={{
        paddingTop: 'max(0px, env(safe-area-inset-top))',
        paddingBottom: 'max(0px, env(safe-area-inset-bottom))',
        minHeight: '100%'
      }}>
        {children}
      </div>
    </div>
  )
}
