import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BookOpen, Users, GraduationCap, Plus } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { NewClassDialog } from '@/components/novos-membros/new-class-dialog'

export default async function NovosMembrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('church_id, full_name, role, id').eq('id', user.id).single()
  if (!profile?.church_id) return null

  const { data: classes } = await supabase
    .from('new_members_classes')
    .select('*, teacher:profiles!new_members_classes_teacher_id_fkey(full_name)')
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Turmas Ativas', value: activeClasses.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Alunos Matriculados', value: totalEnrolled, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Turmas Concluídas', value: (classes?.filter(c => c.status === 'concluida') || []).length, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Turmas</h2>
          <NewClassDialog churchId={profile.church_id} userId={profile.id} />
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
                      <TableCell className="text-sm text-slate-600">{cls.teacher?.full_name || '—'}</TableCell>
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
                        <Badge variant={cls.status === 'ativa' ? 'success' : cls.status === 'concluida' ? 'info' : 'outline'}>
                          {cls.status === 'ativa' ? 'Ativa' : cls.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/novos-membros/turmas/${cls.id}`}>
                          <Button variant="ghost" size="sm">Gerenciar</Button>
                        </Link>
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
