import BottomNav from './BottomNav'

export default function AppShell({ children, nav = false }) {
  // Normal document flow (body scrolls) rather than a position:fixed scroll box.
  // In an iOS standalone PWA a fixed inset:0 element's height can mismatch the
  // visible screen, pushing the bottom of the scroll area (and the content
  // scrolled to it) off-screen behind a strip. Flowing content with a
  // min-height of 100dvh always reaches the true bottom, and the safe-area
  // insets keep content clear of the notch and home indicator.
  //
  // `nav` opts a screen into the floating bottom tab bar. A spacer of the bar's
  // height keeps the last content scrollable clear of it.
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
      {nav && (
        <>
          <div aria-hidden style={{ height: 'calc(84px + env(safe-area-inset-bottom))' }} />
          <BottomNav />
        </>
      )}
    </div>
  )
}
