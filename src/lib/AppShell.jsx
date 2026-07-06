export default function AppShell({ children }) {
  return (
    <div className="font-sans" style={{ position: 'fixed', inset: 0, overflowY: 'auto', backgroundColor: 'var(--bg)', transition: 'background-color .35s cubic-bezier(0.23,1,0.32,1)' }}>
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
