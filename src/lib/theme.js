// Exact Supernotes-derived tokens. Two secondary-text tones restored per the
// full spec: `slate` (darker, fore8 — field labels, timestamps, captions
// that should still read clearly) and `muted` (lighter, fore6 — genuinely
// de-emphasized text like placeholders and empty states). Accent stays
// constant blue across all four themes, matching Supernotes' own system.
export const THEME_COLORS = {
  chalk: {
    bg: 'hsl(264,3%,94%)', card: 'hsl(264,100%,100%)', cardAlt: 'hsl(264,3%,90%)',
    ink: 'hsl(264,6%,17%)', slate: 'hsl(264,4%,46%)', muted: 'hsl(264,3%,59%)',
    border: 'hsl(264,6%,93%)'
  },
  parchment: {
    bg: 'hsl(20,30%,94%)', card: 'hsl(20,30%,97%)', cardAlt: '#ebe0db',
    ink: 'hsl(20,6%,17%)', slate: 'hsl(20,5%,46%)', muted: 'hsl(264,3%,59%)',
    border: 'hsl(20,20%,89%)'
  },
  slate: {
    bg: 'hsl(227,6%,10%)', card: 'hsl(225,5%,19%)', cardAlt: 'hsl(227,5.6%,13%)',
    ink: 'hsl(270,3%,87%)', slate: 'hsl(227,4%,62%)', muted: 'hsl(227,3%,50%)',
    border: 'hsl(227,5%,21%)'
  },
  blackboard: {
    bg: '#090a0b', card: 'hsl(220,10%,13%)', cardAlt: 'hsl(220,11%,9.5%)',
    ink: 'hsl(270,3%,75%)', slate: 'hsl(220,4%,57%)', muted: 'hsl(220,3%,45%)',
    border: 'hsl(220,9%,14%)'
  }
}

export const THEMES = [
  { id: 'chalk', name: 'Chalk', desc: 'Light, bright & white', swatch: 'bg-slate-100' },
  { id: 'parchment', name: 'Parchment', desc: 'Warm, crème & milky', swatch: 'bg-orange-50' },
  { id: 'slate', name: 'Slate', desc: 'Gray, hazy & dim', swatch: 'bg-slate-700' },
  { id: 'blackboard', name: 'Blackboard', desc: 'Dark, deep & midnight', swatch: 'bg-slate-950' }
]
