// Client side of photo → plan: shrink the photo, send it to the extraction
// endpoint with the student's auth token, hand back draft chapters.
import { supabase } from './supabase'

// Phones shoot 12MP photos; the AI reads a syllabus fine at ~1600px and the
// upload drops from ~4MB to ~300KB. Returns base64 without the data: prefix.
export function resizeImage(file, maxEdge = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('could not read image'))
    }
    img.src = url
  })
}

// One scan. Resolves to { topics, note, page_type, remaining } or throws
// with a student-friendly message.
export async function scanPhoto(file, subjects = []) {
  const { base64, mediaType } = await resizeImage(file)
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Please log in again, then retry.')

  const r = await fetch('/api/extract-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image: base64, media_type: mediaType, subjects })
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) {
    // The server's `error` is already student-voice (limit reached, reader
    // busy). Append `detail` while the feature is young — a student sees one
    // extra technical line; we see the actual failure.
    const friendly = body.error || "We couldn't read the photo — please try again."
    const detail = body.detail ? ` (${body.detail})` : ''
    throw new Error(`${friendly}${detail}`)
  }
  return body
}
