import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const SELECTED_KEY = 'sr_selected_student_id'

export function useStudentProfile() {
  const { user } = useAuth()
  const [student, setStudent] = useState(null)
  const [allStudents, setAllStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadStudents()
  }, [user])

  async function loadStudents() {
    setLoading(true)

    const { data: accountRow } = await supabase
      .from('accounts')
      .select('account_type, name')
      .eq('id', user.id)
      .single()

    const { data: existing } = await supabase
      .from('students')
      .select('*')
      .eq('owner_account_id', user.id)
      .order('created_at', { ascending: true })

    if (existing && existing.length > 0) {
      setAllStudents(existing)
      const savedId = localStorage.getItem(SELECTED_KEY)
      const match = existing.find(s => s.id === savedId)
      setStudent(match || existing[0])
      setLoading(false)
      return
    }

    // Parents never get an auto-created profile — they explicitly add children instead.
    if (accountRow?.account_type === 'parent') {
      setAllStudents([])
      setStudent(null)
      setLoading(false)
      return
    }

    // Students get exactly one self-managed profile, created on first login only.
    const { data: created, error } = await supabase
      .from('students')
      .insert({
        owner_account_id: user.id,
        managed_by_parent: false,
        name: accountRow?.name || 'Student'
      })
      .select()
      .single()

    if (error) console.error(error)
    setAllStudents(created ? [created] : [])
    setStudent(created)
    setLoading(false)
  }

  function selectStudent(id) {
    localStorage.setItem(SELECTED_KEY, id)
    const match = allStudents.find(s => s.id === id)
    if (match) setStudent(match)
  }

  async function addChild(name, classGrade) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        owner_account_id: user.id,
        managed_by_parent: true,
        name,
        class_grade: classGrade
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return null
    }

    const updated = [...allStudents, data]
    setAllStudents(updated)
    selectStudent(data.id)
    return data
  }

  return { student, allStudents, loading, selectStudent, addChild }
}
