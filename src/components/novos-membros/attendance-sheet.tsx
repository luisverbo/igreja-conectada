'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, X, CheckCheck, Pencil, Loader2, CalendarDays } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'

interface Props {
  lessons: any[]
  enrollments: any[]
  attendanceRecords: any[]
  userId: string
  canManage?: boolean
  teachers?: { id: string; full_name: string }[]
  turmaId?: string
  closeAfterLesson?: number | null
  enrollmentOpen?: boolean
}

// present: true | false | undefined (not recorded yet)
type AttState = Record<string, boolean | undefined>

export function AttendanceSheet({
  lessons, enrollments, attendanceRecords, userId, canManage = true,
  teachers = [], turmaId, closeAfterLesson, enrollmentOpen,
}: Props) {
  const router = useRouter()
  const [selectedLesson, setSelectedLesson] = useState<string>(
    lessons.find(l => l.status === 'pendente')?.id || lessons[0]?.id || ''
  )
  const [lessonDate, setLessonDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [lessonTeachers, setLessonTeachers] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    lessons.forEach(l => { if (l.teacher_id) m[l.id] = l.teacher_id })
    return m
  })

  const teacherName = (id?: string) => teachers.find(t => t.id === id)?.full_name

  // attendance per lesson: { lessonId: { personId: present } }
  const [att, setAtt] = useState<Record<string, AttState>>(() => {
    const m: Record<string, AttState> = {}
    lessons.forEach(l => { m[l.id] = {} })
    attendanceRecords.forEach(a => {
      if (!m[a.lesson_id]) m[a.lesson_id] = {}
      m[a.lesson_id][a.person_id] = a.present
    })
    return m
  })

  // local lesson meta (title/status/date) so edits reflect without refresh
  const [lessonMeta, setLessonMeta] = useState<Record<string, { title: string; status: string; lesson_date: string | null }>>(() => {
    const m: Record<string, { title: string; status: string; lesson_date: string | null }> = {}
    lessons.forEach(l => { m[l.id] = { title: l.title, status: l.status, lesson_date: l.lesson_date } })
    return m
  })

  const currentLesson = lessons.find(l => l.id === selectedLesson)
  const currentMeta = currentLesson ? lessonMeta[currentLesson.id] : null
  const currentAtt = att[selectedLesson] || {}

  const presentCount = enrollments.filter(e => currentAtt[e.person_id] === true).length
  const absentCount = enrollments.filter(e => currentAtt[e.person_id] === false).length
  const pendingCount = enrollments.length - presentCount - absentCount

  async function ensureLessonStarted(lessonId: string) {
    const meta = lessonMeta[lessonId]
    if (meta && meta.status === 'pendente') {
      const supabase = createClient()
      await supabase.from('new_members_lessons')
        .update({ status: 'realizada', lesson_date: lessonDate })
        .eq('id', lessonId)
      setLessonMeta(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], status: 'realizada', lesson_date: lessonDate } }))

      // Auto-close enrollment window when the configured lesson happens
      const lesson = lessons.find(l => l.id === lessonId)
      if (turmaId && enrollmentOpen && closeAfterLesson && lesson && lesson.lesson_number >= closeAfterLesson) {
        await supabase.from('new_members_classes')
          .update({ enrollment_open: false })
          .eq('id', turmaId)
        router.refresh()
      }
    }
  }

  async function changeTeacher(lessonId: string, teacherId: string) {
    setLessonTeachers(prev => ({ ...prev, [lessonId]: teacherId }))
    const supabase = createClient()
    await supabase.from('new_members_lessons')
      .update({ teacher_id: teacherId || null })
      .eq('id', lessonId)
  }

  async function mark(personId: string, enrollmentId: string, present: boolean) {
    const prev = att[selectedLesson]?.[personId]
    // tapping the same state again clears the record visually (keeps record, just flips)
    const next = prev === present ? undefined : present
    if (next === undefined) {
      // Undo: delete the record
      setAtt(p => ({ ...p, [selectedLesson]: { ...p[selectedLesson], [personId]: undefined } }))
      setSaving(p => ({ ...p, [personId]: true }))
      const supabase = createClient()
      await supabase.from('new_members_attendance')
        .delete()
        .eq('lesson_id', selectedLesson)
        .eq('person_id', personId)
      setSaving(p => ({ ...p, [personId]: false }))
      return
    }

    // Optimistic update + immediate save
    setAtt(p => ({ ...p, [selectedLesson]: { ...p[selectedLesson], [personId]: next } }))
    setSaving(p => ({ ...p, [personId]: true }))

    const supabase = createClient()
    await ensureLessonStarted(selectedLesson)
    const { error } = await supabase.from('new_members_attendance').upsert({
      lesson_id: selectedLesson,
      enrollment_id: enrollmentId,
      person_id: personId,
      present: next,
      recorded_by: userId,
      recorded_at: new Date().toISOString(),
    }, { onConflict: 'lesson_id,person_id' })

    if (error) {
      // revert on failure
      setAtt(p => ({ ...p, [selectedLesson]: { ...p[selectedLesson], [personId]: prev } }))
    }
    setSaving(p => ({ ...p, [personId]: false }))
  }

  async function markAllPresent() {
    setBulkSaving(true)
    const supabase = createClient()
    await ensureLessonStarted(selectedLesson)

    const records = enrollments.map(e => ({
      lesson_id: selectedLesson,
      enrollment_id: e.id,
      person_id: e.person_id,
      present: true,
      recorded_by: userId,
      recorded_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('new_members_attendance').upsert(records, { onConflict: 'lesson_id,person_id' })

    if (!error) {
      const all: AttState = {}
      enrollments.forEach(e => { all[e.person_id] = true })
      setAtt(p => ({ ...p, [selectedLesson]: all }))
    }
    setBulkSaving(false)
  }

  async function saveTitle(lessonId: string) {
    const title = titleDraft.trim()
    setEditingTitle(null)
    if (!title || title === lessonMeta[lessonId]?.title) return
    setLessonMeta(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], title } }))
    const supabase = createClient()
    await supabase.from('new_members_lessons').update({ title }).eq('id', lessonId)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-slate-900">📋 Chamada</h2>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1">{presentCount} ✓</span>
            <span className="rounded-full bg-red-100 text-red-600 px-2.5 py-1">{absentCount} ✗</span>
            {pendingCount > 0 && <span className="rounded-full bg-slate-100 text-slate-500 px-2.5 py-1">{pendingCount} —</span>}
          </div>
        </div>

        {/* Lesson selector — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {lessons.map(lesson => {
            const meta = lessonMeta[lesson.id]
            const isActive = selectedLesson === lesson.id
            const done = meta?.status === 'realizada'
            return (
              <button
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson.id)}
                className={`flex-shrink-0 snap-start rounded-xl border-2 px-3.5 py-2 text-left transition-all min-w-[110px] active:scale-[0.97] ${
                  isActive
                    ? 'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200'
                    : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-violet-200' : done ? 'text-emerald-500' : 'text-slate-400'}`}>
                  Aula {lesson.lesson_number} {done && '✓'}
                </p>
                <p className="text-sm font-semibold truncate max-w-[130px]">{meta?.title || `Aula ${lesson.lesson_number}`}</p>
                {teacherName(lessonTeachers[lesson.id]) && (
                  <p className={`text-[10px] truncate max-w-[130px] ${isActive ? 'text-violet-100' : 'text-slate-500'}`}>
                    👤 {teacherName(lessonTeachers[lesson.id])}
                  </p>
                )}
                {meta?.lesson_date && (
                  <p className={`text-[10px] ${isActive ? 'text-violet-200' : 'text-slate-400'}`}>{formatDate(meta.lesson_date)}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {currentLesson && currentMeta && (
        <>
          {/* Lesson info bar */}
          <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {canManage && teachers.length > 0 && (
                <select
                  value={lessonTeachers[currentLesson.id] || ''}
                  onChange={e => changeTeacher(currentLesson.id, e.target.value)}
                  title="Professor desta aula"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 max-w-[160px]"
                >
                  <option value="">Sem professor</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>👤 {t.full_name}</option>)}
                </select>
              )}
              {editingTitle === currentLesson.id ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={() => saveTitle(currentLesson.id)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(currentLesson.id); if (e.key === 'Escape') setEditingTitle(null) }}
                  className="h-9 rounded-lg border border-violet-300 px-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 w-52"
                />
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-900 truncate">{currentMeta.title}</p>
                  {canManage && (
                    <button
                      onClick={() => { setEditingTitle(currentLesson.id); setTitleDraft(currentMeta.title) }}
                      title="Renomear aula"
                      className="text-slate-400 hover:text-violet-600 flex-shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentMeta.status === 'pendente' ? (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={e => setLessonDate(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-500">Realizada em {formatDate(currentMeta.lesson_date)}</span>
              )}
              <button
                onClick={markAllPresent}
                disabled={bulkSaving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 active:scale-[0.97] transition-transform"
              >
                {bulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Todos presentes
              </button>
            </div>
          </div>

          {/* Student list — big touch targets */}
          <div className="divide-y divide-slate-100">
            {enrollments.map((e: any) => {
              const state = currentAtt[e.person_id]
              const isSaving = saving[e.person_id]
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  {/* Avatar */}
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    state === true ? 'bg-emerald-500 text-white'
                    : state === false ? 'bg-red-400 text-white'
                    : 'bg-slate-100 text-slate-500'
                  }`}>
                    {getInitials(e.people?.full_name || '?')}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 truncate">{e.people?.full_name}</p>
                    <p className={`text-xs font-medium ${
                      state === true ? 'text-emerald-600' : state === false ? 'text-red-500' : 'text-slate-400'
                    }`}>
                      {isSaving ? 'Salvando...' : state === true ? 'Presente' : state === false ? 'Faltou' : 'Sem registro'}
                    </p>
                  </div>

                  {/* Big touch buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => mark(e.person_id, e.id, true)}
                      disabled={isSaving}
                      aria-label="Presente"
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${
                        state === true
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-200'
                          : 'border-slate-200 bg-white text-slate-300 hover:border-emerald-300 hover:text-emerald-400'
                      }`}
                    >
                      <Check className="h-6 w-6" strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => mark(e.person_id, e.id, false)}
                      disabled={isSaving}
                      aria-label="Faltou"
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all active:scale-90 ${
                        state === false
                          ? 'border-red-400 bg-red-400 text-white shadow-md shadow-red-200'
                          : 'border-slate-200 bg-white text-slate-300 hover:border-red-300 hover:text-red-400'
                      }`}
                    >
                      <X className="h-6 w-6" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              ✓ A presença é salva automaticamente a cada toque
            </p>
          </div>
        </>
      )}
    </div>
  )
}
