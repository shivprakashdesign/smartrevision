import { motion } from 'framer-motion'

// iOS-style switch. The knob is animated with framer's `x` rather than an
// absolute offset + translate class: framer writes an inline transform, which
// would silently override any Tailwind translate utility on the same element.
export default function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-[52px] h-8 rounded-full p-[3px] flex items-center shrink-0 transition-colors disabled:opacity-40 ${
        checked ? 'bg-brand-500' : 'bg-[var(--card-alt)] border border-[var(--border)]'
      }`}
    >
      <motion.span
        className="block w-[26px] h-[26px] rounded-full bg-white"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </button>
  )
}
