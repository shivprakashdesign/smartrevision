export default function AppShell({ children }) {
  // Normal document flow (body scrolls) rather than a position:fixed scroll box.
  // In an iOS standalone PWA a fixed inset:0 element's height can mismatch the
  // visible screen, pushing the bottom of the scroll area (and the content
  // scrolled to it) off-screen behind a strip. Flowing content with a
  // min-height of 100dvh always reaches the true bottom, and the safe-area
  // insets keep content clear of the notch and home indicator.
  return (
    <div
      className="font-sans"
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        transition: 'background-color .35s cubic-bezier(0.23,1,0.32,1)'
      }}
    >
      {children}
    </div>
  )
}
