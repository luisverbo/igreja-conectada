'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ClipboardList, Check, X, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props {
  lessons: any[]
  enrollments: any[]
  attendanceRecords: any[]
  userId: string
}

export function AttendanceSheet({ lessons, enrollments, attendanceRecords, userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedLesson, setSelectedLesson] = useState<string>(
    lessons.find(l => l.status === 'pendente')?.id || lessons[0]?.id || ''
  )
  const [lessonDate, setLessonDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Build attendance map: {lessonId_personId: attendance}
  const attMap: Record<string, { present: boolean; id?: string }> = {}
  attendanceRecords.forEach(a => {
    attMap[`${a.lesson_id}_${a.person_id}`] = { present: a.present, id: a.id }
  })

  // Local state for editing current lesson
  const [localAtt, setLocalAtt] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    enrollments.forEach(e => {
      const key = `${selectedLesson}_${e.person_id}`
      m[e.person_id] = attMap[key]?.present ?? false
    })
    return m
  })

  function switchLesson(lessonId: string) {
    setSelectedLesson(lessonId)
    const m: Record<string, boolean> = {}
    enrollments.forEach(e => {
      const key = `${lessonId}_${e.person_id}`
      m[e.person_id] = attMap[key]?.present ?? false
    })
    setLocalAtt(m)
  }

  function toggle(personId: string) {
    setLocalAtt(prev => ({ ...prev, [personId]: !prev[personId] }))
  }

  async function saveAttendance() {
    const supabase = createClient()
    const lesson = lessons.find(l => l.id === selectedLesson)
    if (!lesson) return

    // Update lesson date if needed
    if (lesson.status === 'pendente') {
      await supabase.from('new_members_lessons').update({ status: 'realizada', lesson_date: lessonDate }).eq('id', selectedLesson)
    }

    // Upsert attendance for each enrollment
    const records = enrollments.map(e => ({
      lesson_id: selectedLesson,
      enrollment_id: e.id,
      person_id: e.person_id,
      present: localAtt[e.person_id] ?? false,
      recorded_by: userId,
      recorded_at: new Date().toISOString(),
    }))

    await supabase.from('new_members_attendance').upsert(records, { onConflict: 'lesson_id,person_id' })

    startTransition(() => router.refresh())
  }

  const currentLesson = lessons.find(l => l.id === selectedLesson)
  const presentCount = Object.values(localAtt).filter(Boolean).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          Lista de Chamada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lesson selector */}
        <div className="flex gap-2 flex-wrap">
          {lessons.map(lesson => (
            <button
              key={lesson.id}
              onClick={() => switchLesson(lesson.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedLesson === lesson.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              Aula {lesson.lesson_number}
              {lesson.status === 'realizada' && <Check className="inline-block ml-1 h-3 w-3 text-emerald-500" />}
            </button>
          ))}
        </div>

        {currentLesson && (
          <>
            <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{currentLesson.title}</p>
                <p className="text-xs text-slate-500">
                  {currentLesson.status === 'realizada'
                    ? `Realizada em ${formatDate(currentLesson.lesson_date)}`
                    : 'Aula pendente'
                  }
                </p>
              </div>
              {currentLesson.status === 'pendente' && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="lesson-date" className="text-xs">Data:</Label>
                  <Input
                    id="lesson-date"
                    type="date"
                    value={lessonDate}
                    onChange={e => setLessonDate(e.target.value)}
                    className="h-8 w-36 text-sm"
                  />
                </div>
              )}
              <Badge variant="secondary">{presentCount}/{enrollments.length} presentes</Badge>
            </div>

            {/* Attendance list */}
            <div className="space-y-1">
              {enrollments.map((e: any) => {
                const isPresent = localAtt[e.person_id] ?? false
                return (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between rounded-lg border px-4 py-2.5 transition-colors cursor-pointer ${
                      isPresent
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => toggle(e.person_id)}
                  >
                    <span className={`text-sm font-medium ${isPresent ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {e.people?.full_name}
                    </span>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      isPresent ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}>
                      {isPresent
                        ? <Check className="h-4 w-4 text-white" />
                        : <X className="h-4 w-4 text-slate-400" />
                      }
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={saveAttendance} disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar Presença'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
