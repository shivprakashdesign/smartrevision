// Serverless OG injector for shared-topic links.
//
// The app is a client-rendered SPA, so crawlers (WhatsApp, Twitter, iMessage…)
// never see per-topic meta tags. vercel.json rewrites /s/:token to this
// function, which fetches the topic from Supabase, injects rich OG/Twitter
// tags into the app's index.html, and returns it. Humans still get the full
// SPA (same asset tags); bots get a proper preview.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  const token = (req.query.token || '').toString()
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${host}`

  let title = 'A shared revision topic'
  let description = 'Beat the forgetting curve — revise at the right moments so it sticks.'
  let image = `${origin}/icon-512.png`

  try {
    if (SUPABASE_URL && SUPABASE_ANON && token) {
      const url = `${SUPABASE_URL}/rest/v1/topics?share_token=eq.${encodeURIComponent(token)}&shared=eq.true&select=topic_name,subject,notes,topic_images(image_url)`
      const r = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } })
      const rows = await r.json()
      const t = Array.isArray(rows) ? rows[0] : null
      if (t) {
        title = `${t.topic_name} · ${t.subject}`
        description = t.notes ? String(t.notes).slice(0, 150) : `A ${t.subject} revision on SmartRevision`
        if (t.topic_images?.[0]?.image_url) image = t.topic_images[0].image_url
      }
    }
  } catch {
    // fall through to defaults
  }

  let html
  try {
    html = await (await fetch(`${origin}/index.html`)).text()
  } catch {
    return res.status(302).setHeader('Location', '/').end()
  }

  const og = `
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:url" content="${esc(origin)}/s/${esc(token)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
  `

  let out = html.replace(/<!-- og:start -->[\s\S]*?<!-- og:end -->/, `<!-- og:start -->${og}<!-- og:end -->`)
  if (out === html) out = html.replace('</head>', `${og}</head>`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400')
  res.status(200).send(out)
}
