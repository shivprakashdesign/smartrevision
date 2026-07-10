import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react'
// Direct file path (not the package specifier) because the package's exports
// map doesn't expose the .wasm subpath.
import wasmUrl from '../../node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url'

// Serve the renderer WASM from our own bundle instead of the jsDelivr CDN the
// player defaults to — so empty-state animations work offline (this is a PWA)
// and don't depend on a third-party host.
setWasmUrl(wasmUrl)

/**
 * A small looping dotLottie animation used in empty states, replacing the old
 * emoji placeholders. When the user prefers reduced motion it doesn't animate;
 * instead it freezes on the final frame — the completed illustration (grown
 * plant, stacked books, joined fist-bump) — since frame 0 of these is near-empty.
 * Size is the square px dimension of the animation box.
 */
export default function LottieEmpty({ src, size = 128, className = '' }) {
  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // On load, park a reduced-motion animation on its last (complete) frame.
  const onRef = (dot) => {
    if (!dot || !reduce) return
    dot.addEventListener('load', () => {
      dot.setFrame(Math.max(0, dot.totalFrames - 1))
      dot.pause()
    })
  }

  return (
    <div
      className={`mx-auto ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <DotLottieReact
        src={src}
        loop={!reduce}
        autoplay={!reduce}
        dotLottieRefCallback={onRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
