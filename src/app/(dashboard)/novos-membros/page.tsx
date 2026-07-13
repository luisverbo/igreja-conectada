import { getSessionProfile } from '@/lib/get-profile'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookOpen, Users, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { NewClassDialog } from '@/components/novos-membros/new-class-dialog'
import { CopyLinkButton } from '@/components/novos-membros/copy-link-button'
import { ChurchQrCard } from '@/components/novos-membros/church-qr-card'
import { Clock } from 'lucide-react'
import { DepartmentTeamCard } from '@/components/configuracoes/department-team-card'
import { FULL_ACCESS } from '@/lib/roles'

export default async function NovosMembrosPage() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return null
  if (!profile?.church_id) return null

  const [{ data: classes }, { data: church }, { data: waitlist }] = await Promise.all([
    supabase
      .from('new_members_classes')
      .select('*, registration_token, teacher:profiles!new_members_classes_teacher_id_fkey(full_name)')
      .eq('church_id', profile.church_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('churches')
      .select('name, registration_token')
      .eq('id', profile.church_id)
      .single(),
    supabase
      .from('enrollment_waitlist')
      .select('id, created_at, people(id, full_name, phone)')
      .eq('church_id', profile.church_id)
      .eq('status', 'aguardando')
      .order('created_at'),
  ])

  // Enrollments count per class
  const classIds = classes?.map(c => c.id) || []
  const { data: enrollmentCounts } = await supabase
    .from('new_members_enrollments')
    .select('class_id')
    .in('class_id', classIds)

  const countMap: Record<string, number> = {}
  enrollmentCounts?.forEach(e => {
    countMap[e.class_id] = (countMap[e.class_id] || 0) + 1
  })

  const activeClasses = classes?.filter(c => c.status === 'ativa') || []
  const totalEnrolled = Object.values(countMap).reduce((a, b) => a + b, 0)

  const dayLabels: Record<string, string> = {
    domingo: 'Dom', segunda: 'Seg', terca: 'Ter', quarta: 'Qua',
    quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb',
  }

  return (
    <div>
      <Header title="Novos Membros" description="Turmas, matrículas e controle de presença" userName={profile.full_name} userRole={profile.role} />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Turmas Ativas', value: activeClasses.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Alunos Matriculados', value: totalEnrolled, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Turmas Concluídas', value: (classes?.filter(c => c.status === 'concluida') || []).length, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Fila de Espera', value: waitlist?.length || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${s.color}`} />
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

        {/* QR Code + Fila de espera */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {church?.registration_token && (
            <ChurchQrCard token={church.registration_token} churchName={church.name} />
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Fila de Espera</h3>
              {(waitlist?.length || 0) > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{waitlist!.length}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Serão matriculados automaticamente na próxima turma com inscrições abertas.
            </p>
            {waitlist && waitlist.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {waitlist.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2">
                    <Link href={`/pessoas/${w.people?.id}`} className="text-sm font-medium text-slate-800 hover:text-violet-600 truncate">
                      {w.people?.full_name}
                    </Link>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{formatDate(w.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">Ninguém aguardando no momento 🎉</p>
            )}
          </div>
        </div>

        {/* Equipe do departamento */}
        {[...FULL_ACCESS, 'new_members_leader'].includes(profile.role) && (
          <DepartmentTeamCard
            churchId={profile.church_id}
            currentUserId={profile.id}
            title="Equipe de Novos Membros"
            description="Pessoas que trabalham no departamento. Professores têm acesso total às turmas; auxiliares só dão presença."
            deptRoles={['new_members_leader', 'new_members_teacher', 'new_members_helper']}
            assignRoles={['new_members_teacher', 'new_members_helper']}
            canEdit={[...FULL_ACCESS, 'new_members_leader'].includes(profile.role)}
            moduleKey="novos-membros"
            moduleLabel="Novos Membros"
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Turmas</h2>
          {[...FULL_ACCESS, 'new_members_leader', 'new_members_teacher'].includes(profile.role) && (
            <NewClassDialog churchId={profile.church_id} userId={profile.id} />
          )}
        </div>

        {/* Classes table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Dia / Hora</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead>Aulas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes && classes.length > 0 ? (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{cls.name}</p>
                        {cls.location && <p className="text-xs text-slate-400">{cls.location}</p>}
                      </TableCell>
                      <TableCell>
                        {cls.teacher?.full_name ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex-shrink-0">
                              {cls.teacher.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-slate-700">{cls.teacher.full_name}</span>
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {cls.day_of_week && <span className="mr-1">{dayLabels[cls.day_of_week] || cls.day_of_week}</span>}
                        {cls.time_start && <span className="text-slate-400">{cls.time_start.slice(0, 5)}</span>}
                        {!cls.day_of_week && !cls.time_start && '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{countMap[cls.id] || 0} aluno(s)</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{cls.total_lessons} aulas</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={cls.status === 'ativa' ? 'success' : cls.status === 'concluida' ? 'info' : 'outline'}>
                            {cls.status === 'ativa' ? 'Ativa' : cls.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                          </Badge>
                          {cls.status === 'ativa' && (
                            <span className={`text-[10px] font-semibold ${cls.enrollment_open ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {cls.enrollment_open ? '🟢 Inscrições abertas' : '🔒 Inscrições fechadas'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cls.registration_token && cls.status === 'ativa' && cls.enrollment_open && (
                            <CopyLinkButton token={cls.registration_token} />
                          )}
                          <Link href={`/novos-membros/turmas/${cls.id}`}>
                            <Button variant="ghost" size="sm">Gerenciar</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma turma cadastrada</p>
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
