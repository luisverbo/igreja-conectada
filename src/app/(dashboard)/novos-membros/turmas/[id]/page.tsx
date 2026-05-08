import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Users, CheckCircle, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { EnrollmentDialog } from '@/components/novos-membros/enrollment-dialog'
import { AttendanceSheet } from '@/components/novos-membros/attendance-sheet'
import { CompleteClassButton, RemoveEnrollmentButton, MarkStudentCompleteButton } from '@/components/novos-membros/turma-actions'

export default async function TurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('church_id, full_name, role, id').eq('id', user.id).single()

  const [
    { data: turma },
    { data: lessons },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from('new_members_classes').select('*, teacher:profiles!new_members_classes_teacher_id_fkey(full_name)').eq('id', id).single(),
    supabase.from('new_members_lessons').select('*').eq('class_id', id).order('lesson_number'),
    supabase.from('new_members_enrollments')
      .select('*, people(id, full_name, phone, status)')
      .eq('class_id', id)
      .order('enrolled_at'),
  ])

  if (!turma) notFound()

  // Attendance summary per person
  const enrollmentIds = enrollments?.map(e => e.id) || []
  const { data: attendanceRecords } = await supabase
    .from('new_members_attendance')
    .select('*')
    .in('enrollment_id', enrollmentIds)

  const presenceMap: Record<string, { present: number; total: number }> = {}
  enrollments?.forEach(e => {
    presenceMap[e.id] = { present: 0, total: lessons?.length || 0 }
  })
  attendanceRecords?.forEach(a => {
    if (presenceMap[a.enrollment_id]) {
      if (a.present) presenceMap[a.enrollment_id].present += 1
    }
  })

  const completedLessons = lessons?.filter(l => l.status === 'realizada') || []
  const dayLabels: Record<string, string> = {
    domingo: 'Domingo', segunda: 'Segunda-feira', terca: 'Terça-feira',
    quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
  }

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/novos-membros" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Novos Membros
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{turma.name}</h1>
            <p className="text-sm text-slate-500">
              {turma.teacher?.full_name && `Professor: ${turma.teacher.full_name}`}
              {turma.day_of_week && ` · ${dayLabels[turma.day_of_week] || turma.day_of_week}`}
              {turma.time_start && ` às ${turma.time_start.slice(0, 5)}`}
              {turma.location && ` · ${turma.location}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={turma.status === 'ativa' ? 'success' : turma.status === 'concluida' ? 'info' : 'outline'}>
              {turma.status === 'ativa' ? 'Ativa' : turma.status === 'concluida' ? 'Concluída' : 'Cancelada'}
            </Badge>
            {profile && turma.status === 'ativa' && (
              <EnrollmentDialog classId={id} churchId={profile.church_id} userId={profile.id} />
            )}
            {profile && (
              <CompleteClassButton
                turmaId={id}
                turmaStatus={turma.status}
                canManage={['super_admin', 'pastor', 'coordinator', 'new_members_teacher'].includes(profile.role)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Matriculados', value: enrollments?.length || 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Aulas Realizadas', value: completedLessons.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Aulas Totais', value: turma.total_lessons, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Attendance Sheet (interactive) */}
        {lessons && lessons.length > 0 && enrollments && enrollments.length > 0 && (
          <AttendanceSheet
            lessons={lessons}
            enrollments={enrollments}
            attendanceRecords={attendanceRecords || []}
            userId={profile?.id || ''}
          />
        )}

        {/* Enrollments table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-600" />
              Lista de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Frequência</TableHead>
                  <TableHead>Concluído</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments && enrollments.length > 0 ? (
                  enrollments.map((e: any) => {
                    const presence = presenceMap[e.id]
                    const pct = presence?.total > 0 ? Math.round((presence.present / presence.total) * 100) : 0
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Link href={`/pessoas/${e.people?.id}`} className="font-medium text-slate-900 hover:text-violet-600">
                            {e.people?.full_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{e.people?.phone || '—'}</TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(e.enrolled_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-slate-100">
                              <div
                                className={`h-1.5 rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">{presence?.present || 0}/{presence?.total || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <MarkStudentCompleteButton
                            enrollmentId={e.id}
                            personId={e.people?.id}
                            completed={e.completed}
                          />
                        </TableCell>
                        <TableCell>
                          {turma.status === 'ativa' && (
                            <RemoveEnrollmentButton
                              enrollmentId={e.id}
                              personId={e.people?.id}
                              personName={e.people?.full_name}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      Nenhum aluno matriculado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
