// Deterministic per-subject colour, shared by the Topics list pills and the
// topic-detail hero so a subject reads the same colour everywhere. Keep the
// class strings as full literals — Tailwind's scanner needs to see them.
//
// A student can override any subject's colour (see ManageSubjects); overrides
// are a { [subjectName]: paletteKey } map loaded into OVERRIDES on sign-in and
// consulted before the name-hash fallback.
const PALETTE = [
  { key: 'emerald', cls: 'bg-emerald-600', rgb: '5,150,105' },
  { key: 'sky', cls: 'bg-sky-600', rgb: '2,132,199' },
  { key: 'violet', cls: 'bg-violet-600', rgb: '124,58,237' },
  { key: 'amber', cls: 'bg-amber-500', rgb: '245,158,11' },
  { key: 'rose', cls: 'bg-rose-500', rgb: '244,63,94' },
  { key: 'indigo', cls: 'bg-indigo-600', rgb: '79,70,229' },
  { key: 'teal', cls: 'bg-teal-600', rgb: '13,148,136' },
  { key: 'fuchsia', cls: 'bg-fuchsia-600', rgb: '192,38,211' }
]
// "General" (the no-subject fallback) reads neutral.
const GENERAL = { key: 'slate', cls: 'bg-slate-500', rgb: '100,116,139' }
const BY_KEY = Object.fromEntries([...PALETTE, GENERAL].map(p => [p.key, p]))

// Palette keys a student can choose from in the recolour picker.
export const SUBJECT_SWATCHES = PALETTE

let OVERRIDES = {}
// Load a student's saved subject→colour overrides. Called when the active
// student changes so every screen's colours reflect their choices.
export function setSubjectColorOverrides(map) {
  OVERRIDES = map && typeof map === 'object' ? map : {}
}

function pick(name) {
  if (name && OVERRIDES[name] && BY_KEY[OVERRIDES[name]]) return BY_KEY[OVERRIDES[name]]
  if (!name || name === 'General') return GENERAL
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function subjectColor(name) {
  return pick(name).cls
}

// Tailwind class for a raw palette key (used by the recolour swatches).
export function colorClassForKey(key) {
  return (BY_KEY[key] || GENERAL).cls
}

// Top-down colour wash for the large hero card, matching the gems/streak
// sheet treatment: a soft tint at the top fading to transparent partway down.
export function subjectGradient(name, alpha = 0.16, stop = '58%', dir = '180deg') {
  const { rgb } = pick(name)
  return `linear-gradient(${dir}, rgba(${rgb},${alpha}) 0%, rgba(${rgb},0) ${stop})`
}

// Flat soft tint for the compact group-header strip on the Topics list.
export function subjectTint(name, alpha = 0.1) {
  const { rgb } = pick(name)
  return `rgba(${rgb},${alpha})`
}
