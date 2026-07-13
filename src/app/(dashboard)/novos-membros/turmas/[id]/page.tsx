import { getSessionProfile } from '@/lib/get-profile'
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
import { CopyLinkButton } from '@/components/novos-membros/copy-link-button'
import { EditClassDialog } from '@/components/novos-membros/edit-class-dialog'
import { DeleteClassButton } from '@/components/novos-membros/delete-class-button'
import { EnrollmentToggle } from '@/components/novos-membros/enrollment-toggle'
import { FichaLinkButton } from '@/components/novos-membros/ficha-link-button'
import { LessonsManager } from '@/components/novos-membros/lessons-manager'
import { FileText } from 'lucide-react'

export default async function TurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return null
  const [
    { data: turma },
    { data: lessons },
    { data: enrollments },
    { data: teachers },
  ] = await Promise.all([
    supabase.from('new_members_classes').select('*, registration_token, teacher:nm_teachers(name)').eq('id', id).single(),
    supabase.from('new_members_lessons').select('*').eq('class_id', id).order('lesson_number'),
    supabase.from('new_members_enrollments')
      .select('*, people(id, full_name, phone, status)')
      .eq('class_id', id)
      .order('enrolled_at'),
    profile?.church_id
      ? supabase.from('nm_teachers').select('id, name').eq('church_id', profile.church_id).eq('active', true).order('name')
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  if (!turma) notFound()

  // Componentes esperam { id, full_name } — mapeia name → full_name
  const teacherList = (teachers || []).map((t: any) => ({ id: t.id, full_name: t.name }))

  // Attendance summary per person
  const enrollmentIds = enrollments?.map(e => e.id) || []
  const [{ data: attendanceRecords }, { data: fichas }] = await Promise.all([
    supabase.from('new_members_attendance').select('*').in('enrollment_id', enrollmentIds),
    supabase.from('student_forms').select('id, person_id, filled_by, filled_at').eq('class_id', id),
  ])
  const fichaByPerson: Record<string, { id: string; filled_by: string | null }> = {}
  fichas?.forEach(f => { if (f.person_id) fichaByPerson[f.person_id] = { id: f.id, filled_by: f.filled_by } })

  const presenceMap: Record<string, { present: number; total: number; credited: number }> = {}
  enrollments?.forEach(e => {
    presenceMap[e.id] = { present: e.credited_lessons || 0, total: lessons?.length || 0, credited: e.credited_lessons || 0 }
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

  const canManage = !!profile && ['super_admin', 'pastor', 'coordinator', 'supervisor', 'new_members_leader', 'new_members_teacher'].includes(profile.role)
  const teacherName = turma.teacher?.name

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/novos-membros" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Novos Membros
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{turma.name}</h1>
                <Badge variant={turma.status === 'ativa' ? 'success' : turma.status === 'concluida' ? 'info' : 'outline'}>
                  {turma.status === 'ativa' ? 'Ativa' : turma.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                </Badge>
              </div>

              {/* Info chips */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {teacherName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 pl-1 pr-3 py-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold">
                      {teacherName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-violet-800">Prof. {teacherName}</span>
                  </span>
                )}
                {turma.day_of_week && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    📅 {dayLabels[turma.day_of_week] || turma.day_of_week}{turma.time_start && ` · ${turma.time_start.slice(0, 5)}`}
                  </span>
                )}
                {turma.location && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    📍 {turma.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {canManage && turma.status === 'ativa' && (
              <EnrollmentToggle
                turmaId={id}
                enrollmentOpen={turma.enrollment_open ?? true}
                closeAfterLesson={turma.close_after_lesson}
              />
            )}
            {canManage && <EditClassDialog turma={turma} />}
            {turma.registration_token && turma.status === 'ativa' && turma.enrollment_open && (
              <CopyLinkButton token={turma.registration_token} />
            )}
            {turma.registration_token && (
              <FichaLinkButton token={turma.registration_token} turmaName={turma.name} />
            )}
            {profile && canManage && turma.status === 'ativa' && (
              <EnrollmentDialog classId={id} churchId={profile.church_id} userId={profile.id} />
            )}
            {profile && (
              <CompleteClassButton
                turmaId={id}
                turmaStatus={turma.status}
                canManage={canManage}
              />
            )}
            {profile && ['super_admin', 'pastor', 'coordinator', 'supervisor', 'new_members_leader'].includes(profile.role) && (
              <DeleteClassButton turmaId={id} turmaName={turma.name} studentCount={enrollments?.length || 0} />
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Matriculados', value: enrollments?.length || 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Aulas Realizadas', value: completedLessons.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Aulas Totais', value: turma.total_lessons, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                  <div className={`h-9 w-9 rounded-lg ${s.bg} hidden sm:flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900">{s.value}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-tight">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Cronograma de aulas — datas, professores e cancelamentos */}
        {lessons && lessons.length > 0 && (
          <LessonsManager lessons={lessons} teachers={teacherList} canManage={canManage} />
        )}

        {/* Attendance Sheet (interactive, auto-save) — ignora aulas canceladas */}
        {lessons && lessons.filter(l => l.status !== 'cancelada').length > 0 && enrollments && enrollments.length > 0 && (
          <AttendanceSheet
            lessons={lessons.filter(l => l.status !== 'cancelada')}
            enrollments={enrollments}
            attendanceRecords={attendanceRecords || []}
            userId={profile?.id || ''}
            canManage={canManage}
            teachers={teacherList}
            turmaId={id}
            closeAfterLesson={turma.close_after_lesson}
            enrollmentOpen={turma.enrollment_open ?? true}
          />
        )}

        {/* Empty state: no students yet */}
        {(!enrollments || enrollments.length === 0) && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 mb-1">Nenhum aluno matriculado ainda</p>
            <p className="text-xs text-slate-400">Use &ldquo;Matricular Aluno&rdquo; acima ou compartilhe o link de inscrição.</p>
          </div>
        )}

        {/* Enrollments table */}
        {enrollments && enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-600" />
              Lista de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Ficha</TableHead>
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
                        <TableCell>
                          {fichaByPerson[e.people?.id] ? (
                            <Link
                              href={`/novos-membros/fichas/${fichaByPerson[e.people.id].id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold hover:bg-emerald-200"
                            >
                              <FileText className="h-3 w-3" /> Ver ficha
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-400 px-2 py-0.5 text-xs font-medium">
                              Pendente
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-slate-100">
                              <div
                                className={`h-1.5 rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">{presence?.present || 0}/{presence?.total || 0}</span>
                            {presence?.credited > 0 && (
                              <span className="text-[10px] text-amber-600 font-semibold" title={e.credit_note || ''}>+{presence.credited} reap.</span>
                            )}
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
        )}
      </div>
    </div>
  )
}
