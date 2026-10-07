import { getSessionProfile } from '@/lib/get-profile'
import { notFound, redirect } from 'next/navigation'
import { FULL_ACCESS } from '@/lib/roles'
import Link from 'next/link'
import { ArrowLeft, Home, MapPin, Users, AlertCircle, Star, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { DISCIPLESHIP_STATUS_LABELS, type DiscipleshipMemberStatus } from '@/lib/types'
import { AddMemberDialog } from '@/components/discipulados/add-member-dialog'
import { ObservationDialog } from '@/components/discipulados/observation-dialog'
import { EditDiscipleshipDialog } from '@/components/discipulados/edit-discipleship-dialog'
import { RemoveMemberButton } from '@/components/discipulados/remove-member-button'
import { ObservationEditButton } from '@/components/discipulados/observation-edit-button'
import { GcaSurveysCard } from '@/components/gca/gca-surveys-card'
import { leadersFull, leaderNames, leadersShort, gcaCapacity } from '@/lib/gca'
import { haversineKm, formatKm } from '@/lib/geo'
import { EncaminharDialog } from '@/components/gca/encaminhar-dialog'
import { DeleteGcaButton } from '@/components/discipulados/delete-gca-button'
import { GcaSignupLinkCard } from '@/components/discipulados/signup-links-dialog'

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
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return null
  const [
    { data: discipleship },
    { data: members },
    { data: gcaSurveys },
  ] = await Promise.all([
    supabase.from('discipleships')
      .select('*, leader:profiles!discipleships_leader_id_fkey(full_name, phone), leader2:profiles!discipleships_leader2_id_fkey(full_name), supervisor:profiles!discipleships_supervisor_id_fkey(full_name), location:gca_locations(name, location_type, host_name, host_phone, address, neighborhood, city)')
      .eq('id', id)
      .single(),
    supabase.from('discipleship_members')
      .select('*, people(id, full_name, phone, status, latitude, longitude), discipleship_observations(id, observation_type, description, needs_care, observation_date, profiles(full_name))')
      .eq('discipleship_id', id)
      .order('status')
      .order('created_at')
      .order('observation_date', { referencedTable: 'discipleship_observations', ascending: false }),
    // Pesquisas vinculadas a ESTE GCA (link exclusivo do grupo)
    supabase.from('survey_targets')
      .select('token, survey:surveys!inner(id, title, description, audience, active)')
      .eq('discipleship_id', id)
      .eq('surveys.active', true),
  ])

  if (!discipleship) notFound()

  // Contagem de respostas por pesquisa deste GCA
  const surveyIds = (gcaSurveys || []).map((t: any) => t.survey?.id).filter(Boolean)
  const { data: surveyResponseRows } = surveyIds.length
    ? await supabase.from('survey_responses').select('survey_id').eq('discipleship_id', id).in('survey_id', surveyIds)
    : { data: [] as { survey_id: string }[] }
  const respCount: Record<string, number> = {}
  surveyResponseRows?.forEach(r => { respCount[r.survey_id] = (respCount[r.survey_id] || 0) + 1 })

  const surveyList = (gcaSurveys || []).map((t: any) => ({
    token: t.token,
    title: t.survey?.title || '',
    description: t.survey?.description ?? null,
    audience: t.survey?.audience,
    responses: respCount[t.survey?.id] || 0,
  }))

  // Quem não é gestão do departamento só acessa GCAs que lidera/supervisiona
  const seesAll = !!profile && [...FULL_ACCESS, 'discipleship_supervisor', 'viewer'].includes(profile.role)
  const isMine = !!profile && [discipleship.leader_id, discipleship.leader2_id, discipleship.supervisor_id].includes(profile.id)
  if (!seesAll && !isMine) {
    redirect('/discipulados')
  }

  const activeMembers = members?.filter(m => m.status !== 'inativo') || []
  const needCare = members?.filter(m => m.status === 'em_acompanhamento' || m.status === 'situacao_sensivel') || []
  const liberadosServir = members?.filter(m => m.status === 'liberado_para_servir') || []

  // ── Lotação: limite próprio ou padrão da igreja ──
  const isManager = !!profile && [...FULL_ACCESS, 'discipleship_supervisor'].includes(profile.role)
  const { data: churchRow } = await supabase
    .from('churches').select('gca_default_max_members').eq('id', discipleship.church_id).single()
  const defaultLimit = churchRow?.gca_default_max_members ?? null
  const cap = gcaCapacity(discipleship.max_members, defaultLimit, activeMembers.length)

  // Acima do limite → sugere GCAs próximos (a partir deste GCA) que têm vaga
  let suggestions: { id: string; name: string; leaders: string | null; free: number | null; distanceKm: number | null }[] = []
  if (cap.state === 'acima' && isManager) {
    const [{ data: others }, { data: otherRows }] = await Promise.all([
      supabase.from('discipleships')
        .select('id, name, latitude, longitude, max_members, leader_name, leader2_name, leader:profiles!discipleships_leader_id_fkey(full_name), leader2:profiles!discipleships_leader2_id_fkey(full_name)')
        .eq('church_id', discipleship.church_id)
        .eq('status', 'ativo')
        .neq('id', id),
      supabase.from('discipleship_members')
        .select('discipleship_id, discipleships!inner(church_id)')
        .eq('discipleships.church_id', discipleship.church_id)
        .neq('status', 'inativo'),
    ])
    const counts: Record<string, number> = {}
    otherRows?.forEach((r: any) => { counts[r.discipleship_id] = (counts[r.discipleship_id] || 0) + 1 })
    suggestions = (others || [])
      .map((g: any) => {
        const c = gcaCapacity(g.max_members, defaultLimit, counts[g.id] || 0)
        const distanceKm = discipleship.latitude != null && g.latitude != null
          ? haversineKm(discipleship.latitude, discipleship.longitude, g.latitude, g.longitude)
          : null
        return { id: g.id, name: g.name, leaders: leadersShort(g), free: c.free, distanceKm }
      })
      .filter(g => g.free == null || g.free > 0)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 4)
  }

  const dayLabels: Record<string, string> = {
    domingo: 'Domingo', segunda: 'Segunda-feira', terca: 'Terça-feira',
    quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
  }

  return (
    <div>
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/discipulados">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              GCA
            </Button>
          </Link>
        </div>
        {/* Celular: info em cima, botões embaixo. Computador: lado a lado */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <Home className="h-5 w-5 text-violet-500" />
              {discipleship.name}
            </h1>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm text-slate-500">
              {leadersFull(discipleship) && (
                <span>
                  {leaderNames(discipleship).length > 1 ? 'Líderes: ' : 'Líder: '}
                  <strong>{leadersFull(discipleship)}</strong>
                  {leaderNames(discipleship).length > 1 && ' 👫'}
                </span>
              )}
              {discipleship.supervisor?.full_name && <span>· Supervisor: {discipleship.supervisor.full_name}</span>}
              {discipleship.day_of_week && (
                <span>· {dayLabels[discipleship.day_of_week]} {discipleship.time_start?.slice(0, 5)}</span>
              )}
            </div>
            {discipleship.location ? (
              <div className="text-sm text-slate-500 mt-0.5 space-y-0.5">
                <p className="flex items-center gap-1 flex-wrap">
                  <span>{discipleship.location.location_type === 'igreja' ? '⛪' : '🏠'}</span>
                  <strong className="text-slate-700">{discipleship.location.name}</strong>
                  {discipleship.location.host_name && (
                    <span className="text-slate-400"> · Anfitrião: {discipleship.location.host_name}{discipleship.location.host_phone ? ` (${discipleship.location.host_phone})` : ''}</span>
                  )}
                </p>
                {(discipleship.location.address || discipleship.location.neighborhood) && (
                  <p className="flex items-start gap-1 text-slate-400">
                    <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                    {[discipleship.location.address, discipleship.location.neighborhood, discipleship.location.city].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            ) : (discipleship.neighborhood || discipleship.city) && (
              <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[discipleship.address, discipleship.neighborhood, discipleship.city].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap lg:flex-shrink-0">
            <Badge variant={discipleship.status === 'ativo' ? 'success' : 'outline'}>
              {discipleship.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </Badge>
            {profile && ['super_admin', 'pastor', 'coordinator', 'supervisor', 'discipleship_supervisor'].includes(profile.role) && (
              <>
                <EditDiscipleshipDialog discipleship={discipleship} />
                <DeleteGcaButton
                  gcaId={id}
                  gcaName={discipleship.name}
                  memberCount={members?.filter(m => m.status !== 'inativo').length || 0}
                />
              </>
            )}
            {profile && <AddMemberDialog discipleshipId={id} churchId={profile.church_id} userId={profile.id} userRole={profile.role} />}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {discipleship.status === 'ativo' && discipleship.signup_token && (
          <GcaSignupLinkCard gcaName={discipleship.name} token={discipleship.signup_token} />
        )}

        {/* Limite de participantes */}
        {cap.state === 'acima' && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-bold text-red-800">
              🔴 {cap.over} acima do limite — {cap.count} membros para um limite de {cap.limit}
            </p>
            {isManager && (
              suggestions.length > 0 ? (
                <>
                  <p className="text-xs text-red-700 mt-1.5 mb-2">GCAs mais próximos com vaga — use <strong>Transferir</strong> no membro para movê-lo:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(sg => (
                      <Link key={sg.id} href={`/discipulados/${sg.id}`}
                        className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs hover:bg-emerald-50">
                        <span className="font-semibold text-slate-800">{sg.name}</span>
                        {sg.leaders && <span className="text-slate-500"> · {sg.leaders}</span>}
                        <span className="block text-emerald-700 font-semibold">
                          {sg.free == null ? 'sem limite' : `${sg.free} vaga${sg.free === 1 ? '' : 's'}`}
                          {sg.distanceKm != null && ` · ${formatKm(sg.distanceKm)} daqui`}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-red-700 mt-1.5">Nenhum outro GCA ativo tem vaga no momento.</p>
              )
            )}
          </div>
        )}
        {(cap.state === 'lotado' || cap.state === 'quase') && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
            {cap.state === 'lotado' ? `🟠 GCA lotado — ${cap.count}/${cap.limit} participantes` : `🟡 Quase lotado — ${cap.count}/${cap.limit} (${cap.free} vaga${cap.free === 1 ? '' : 's'})`}
          </div>
        )}

        {/* Notice - no attendance */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Foco em Cuidado Pastoral</p>
          <p className="text-sm text-amber-600">Este módulo não registra presença ou faltas. O objetivo é acompanhar a jornada espiritual de cada pessoa.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: cap.limit ? `Membros Ativos (limite ${cap.limit})` : 'Membros Ativos', value: activeMembers.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Em Acompanhamento', value: needCare.length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Liberados p/ Servir', value: liberadosServir.length, icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none sm:leading-normal">{s.value}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-tight mt-1 sm:mt-0">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Pesquisas vinculadas a este GCA */}
        <GcaSurveysCard surveys={surveyList} />

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
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
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
                              {profile && ['super_admin', 'pastor', 'coordinator', 'supervisor', 'discipleship_supervisor', 'discipleship_leader'].includes(profile.role) && (
                                <ObservationEditButton
                                  observationId={latestObs.id}
                                  currentText={latestObs.description || ''}
                                  needsCare={!!latestObs.needs_care}
                                />
                              )}
                              {hasObs && member.discipleship_observations.length > 1 && (
                                <p className="text-xs text-violet-500 mt-1">+{member.discipleship_observations.length - 1} observações anteriores</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0 sm:flex-col sm:items-stretch sm:gap-1 sm:flex-shrink-0">
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
                          <Link href={`/pessoas/${member.people?.id}`} className="hidden sm:block">
                            <Button variant="ghost" size="sm" className="w-full">
                              <Eye className="h-3 w-3 mr-1" />
                              Perfil
                            </Button>
                          </Link>
                          {isManager && member.status !== 'inativo' && member.people?.id && (
                            <EncaminharDialog
                              personId={member.people.id}
                              personName={member.people.full_name}
                              personLat={member.people.latitude ?? null}
                              personLng={member.people.longitude ?? null}
                              churchId={discipleship.church_id}
                              excludeGcaId={id}
                              trigger="link"
                              label="Transferir"
                            />
                          )}
                          {profile && (
                            <RemoveMemberButton
                              memberId={member.id}
                              personId={member.people?.id}
                              personName={member.people?.full_name}
                            />
                          )}
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
