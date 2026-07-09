import { HugeiconsIcon } from '@hugeicons/react'
import { StickyNote02Icon } from '@hugeicons/core-free-icons'

// Shared top-left brand lockup: StickyNote icon + "Smart Revision" wordmark.
// Kept theme-aware via var(--ink) so it stays visible on dark themes.
export default function BrandLogo() {
  return (
    <div className="flex items-center gap-1">
      <HugeiconsIcon icon={StickyNote02Icon} width={26} height={26} strokeWidth={2.0} className="text-[var(--ink)]" />
      <span
        className="text-[var(--ink)]"
        style={{ fontWeight: 600, fontSize: '14px', lineHeight: '80%', letterSpacing: '-0.04em' }}
      >
        Smart<br />Revision
      </span>
    </div>
  )
}
