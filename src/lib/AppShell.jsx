import BottomNav from './BottomNav'

export default function AppShell({ children, nav = false }) {
  // Normal document flow (body scrolls) rather than a position:fixed scroll box.
  // In an iOS standalone PWA a fixed inset:0 element's height can mismatch the
  // visible screen, pushing the bottom of the scroll area (and the content
  // scrolled to it) off-screen behind a strip. Flowing content with a
  // min-height of 100dvh always reaches the true bottom, and the safe-area
  // insets keep content clear of the notch and home indicator.
  //
  // `nav` opts a screen into the bottom tab bar. The shell is a flex column: the
  // content area grows to fill, so a short page still pushes the bar to the true
  // bottom, and a tall page lets the sticky bar pin to the viewport bottom while
  // scrolling — all in normal flow, avoiding the iOS fixed-position first-paint
  // bug. The content's bottom padding clears the raised center "+" that overhangs
  // the bar. For nav screens the sticky bar owns the bottom safe-area (so there's
  // no gap beneath it); plain screens keep it here to clear the home indicator.
  return (
    <div
      className="font-sans"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: nav ? 0 : 'env(safe-area-inset-bottom)',
        transition: 'background-color .35s cubic-bezier(0.23,1,0.32,1)'
      }}
    >
      <div style={{ flex: '1 0 auto', paddingBottom: nav ? '2rem' : 0 }}>{children}</div>
      {nav && <BottomNav />}
    </div>
  )
}
