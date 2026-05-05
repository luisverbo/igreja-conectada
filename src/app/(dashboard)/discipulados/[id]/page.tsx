import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, MapPin, Users, AlertCircle, Star, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { DISCIPLESHIP_STATUS_LABELS, type DiscipleshipMemberStatus } from '@/lib/types'
import { AddMemberDialog } from '@/components/discipulados/add-member-dialog'
import { ObservationDialog } from '@/components/discipulados/observation-dialog'

const statusVariant: Record<DiscipleshipMemberStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline'> = {
  ativo: 'success',
  em_acompanhamento: 'warning',
  situacao_sensivel: 'destructive',
  nao_recomendado_servir: 'destructive',
  liberado_para_servir: 'success',
  inativo: 'outline',
}

export default async function DiscipuladoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, church_id, full_name, role').eq('id', user.id).single()

  const [
    { data: discipleship },
    { data: members },
  ] = await Promise.all([
    supabase.from('discipleships')
      .select('*, leader:profiles!discipleships_leader_id_fkey(full_name, phone), supervisor:profiles!discipleships_supervisor_id_fkey(full_name)')
      .eq('id', id)
      .single(),
    supabase.from('discipleship_members')
      .select('*, people(id, full_name, phone, status), discipleship_observations(id, observation_type, description, needs_care, observation_date, profiles(full_name))')
      .eq('discipleship_id', id)
      .order('status')
      .order('created_at'),
  ])

  if (!discipleship) notFound()

  const activeMembers = members?.filter(m => m.status !== 'inativo') || []
  const needCare = members?.filter(m => m.status === 'em_acompanhamento' || m.status === 'situacao_sensivel') || []
  const liberadosServir = members?.filter(m => m.status === 'liberado_para_servir') || []

  const dayLabels: Record<string, string> = {
    domingo: 'Domingo', segunda: 'Segunda-feira', terca: 'Terça-feira',
    quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
  }

  return (
    <div>
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/discipulados">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Discipulados
            </Button>
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Home className="h-5 w-5 text-violet-500" />
              {discipleship.name}
            </h1>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
              {discipleship.leader?.full_name && <span>Líder: <strong>{discipleship.leader.full_name}</strong></span>}
              {discipleship.supervisor?.full_name && <span>· Supervisor: {discipleship.supervisor.full_name}</span>}
              {discipleship.day_of_week && (
                <span>· {dayLabels[discipleship.day_of_week]} {discipleship.time_start?.slice(0, 5)}</span>
              )}
            </div>
            {(discipleship.neighborhood || discipleship.city) && (
              <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[discipleship.address, discipleship.neighborhood, discipleship.city].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={discipleship.status === 'ativo' ? 'success' : 'outline'}>
              {discipleship.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </Badge>
            {profile && <AddMemberDialog discipleshipId={id} churchId={profile.church_id} userId={profile.id} />}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Notice - no attendance */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Foco em Cuidado Pastoral</p>
          <p className="text-sm text-amber-600">Este módulo não registra presença ou faltas. O objetivo é acompanhar a jornada espiritual de cada pessoa.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Membros Ativos', value: activeMembers.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Em Acompanhamento', value: needCare.length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Liberados p/ Servir', value: liberadosServir.length, icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

        {/* Members list with pastoral care */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            Acompanhamento dos Membros
          </h2>

          {members && members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member: any) => {
                const latestObs = member.discipleship_observations?.[0]
                const hasObs = member.discipleship_observations?.length > 0
                return (
                  <Card key={member.id} className={member.status === 'inativo' ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Link href={`/pessoas/${member.people?.id}`} className="font-semibold text-slate-900 hover:text-violet-600 transition-colors">
                              {member.people?.full_name}
                            </Link>
                            <Badge variant={statusVariant[member.status as DiscipleshipMemberStatus] || 'secondary'}>
                              {DISCIPLESHIP_STATUS_LABELS[member.status as DiscipleshipMemberStatus] || member.status}
                            </Badge>
                            {member.discipleship_observations?.some((o: any) => o.needs_care) && (
                              <Badge variant="warning">⚠️ Precisa de cuidado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Desde {formatDate(member.joined_at)}
                            {member.people?.phone && ` · ${member.people.phone}`}
                          </p>

                          {/* Latest observation */}
                          {latestObs && (
                            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-slate-700">{latestObs.description}</p>
                                <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(latestObs.observation_date)}</span>
                              </div>
                              {latestObs.profiles?.full_name && (
                                <p className="text-xs text-slate-400 mt-1">por {latestObs.profiles.full_name}</p>
                              )}
                              {hasObs && member.discipleship_observations.length > 1 && (
                                <p className="text-xs text-violet-500 mt-1">+{member.discipleship_observations.length - 1} observações anteriores</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {profile && (
                            <ObservationDialog
                              memberId={member.id}
                              discipleshipId={id}
                              personId={member.people?.id}
                              personName={member.people?.full_name}
                              currentStatus={member.status}
                              userId={profile.id}
                            />
                          )}
                          <Link href={`/pessoas/${member.people?.id}`}>
                            <Button variant="ghost" size="sm" className="w-full">
                              <Eye className="h-3 w-3 mr-1" />
                              Perfil
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nenhum membro neste discipulado</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes */}
        {discipleship.notes && (
          <Card>
            <CardHeader><CardTitle>Observações do Grupo</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">{discipleship.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
