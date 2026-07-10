import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// The district we've seeded from UDISE+. Used only to rank local schools above
// the rest — never to filter, so a student outside it can still find theirs.
export const HOME_DISTRICT = 'Daman'

// Typeahead over the canonical schools table. `grade` filters out schools that
// don't teach the student's class: three "Shri Machhi Mahajan" schools share a
// name and a campus, and only the grade range tells them apart.
export async function searchSchools(query, grade) {
  const q = query.trim()
  if (q.length < 2) return []

  const { data, error } = await supabase.rpc('search_schools', {
    q,
    district_hint: HOME_DISTRICT,
    grade_hint: grade ? Number(grade) : null
  })
  if (error) {
    console.error(error)
    return []
  }
  return data || []
}

// Escape hatch for a school the seed doesn't have. Always lands unverified, so
// it sorts below every seeded school and can be reconciled later.
//
// The unique index on (name_key, district) ignores case and punctuation, so
// "D.P.S." collides with an existing "DPS" — we return that row rather than
// surfacing the error, which is the whole point of the constraint.
export async function createSchool(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null

  const { data, error } = await supabase
    .from('schools')
    .insert({ name: trimmed })
    .select()
    .single()

  if (!error) return data

  if (error.code === '23505') {
    const { data: existing } = await supabase.rpc('search_schools', { q: trimmed })
    if (existing?.length) return existing[0]
  }
  console.error(error)
  return null
}

// Find or create the class a student belongs to. Two students signing up for
// the same class at once both race to insert; the loser catches the unique
// violation and reads the winner's row.
export async function findOrCreateClass(schoolId, grade) {
  if (!schoolId || !grade) return null

  const { data: existing } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', schoolId)
    .eq('grade', grade)
    .is('section', null)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('classes')
    .insert({ school_id: schoolId, grade })
    .select('id')
    .single()
  if (!error) return created.id

  if (error.code === '23505') {
    const { data: raced } = await supabase
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('grade', grade)
      .is('section', null)
      .maybeSingle()
    return raced?.id || null
  }
  console.error(error)
  return null
}

// "Classes 6–12 · Fort Area, Moti Daman" — what actually distinguishes two
// schools with near-identical names.
export function schoolSubtitle(s) {
  const range = s.grade_from && s.grade_to ? `Classes ${s.grade_from}–${s.grade_to}` : null
  return [range, s.address].filter(Boolean).join(' · ')
}

// The school and grade behind a student's class_id, for pre-filling settings.
export async function classSchool(classId) {
  if (!classId) return null
  const { data } = await supabase
    .from('classes')
    .select('grade, schools(*)')
    .eq('id', classId)
    .maybeSingle()
  return data?.schools ? { grade: Number(data.grade), school: data.schools } : null
}

// Debounced typeahead. `enabled` lets a caller pause it — while a school is
// already chosen, say — without unmounting the input.
export function useSchoolSearch(query, grade, enabled = true) {
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!enabled || q.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      setResults(await searchSchools(q, grade))
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [query, grade, enabled])

  return { results, searching }
}
