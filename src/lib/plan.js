// Free-tier limits and the Pro feature list. Changing a limit here changes it
// app-wide (client gating); server-side enforcement lives in Supabase.

export const FREE_TOPIC_LIMIT = 10
export const FREE_PHOTOS_PER_TOPIC = 1
export const FREE_THEMES = ['chalk', 'parchment']

export const PRO_FEATURES = [
  { icon: '📅', title: 'Custom schedules', desc: 'Set your own revision intervals, not just the standard cycle.' },
  { icon: '♾️', title: 'Unlimited topics', desc: `Go past the ${FREE_TOPIC_LIMIT}-topic free limit.` },
  { icon: '🖼️', title: 'Multiple photos', desc: 'Attach as many notes/textbook photos as you want per topic.' },
  { icon: '🎨', title: 'Every theme', desc: 'Unlock all four themes, including the dark ones.' }
]
