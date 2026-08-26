import { getSessionProfile } from '@/lib/get-profile'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Home, Users, AlertCircle, MapPin } from 'lucide-react'
import Link from 'next/link'
import { NewDiscipleshipDialog } from '@/components/discipulados/new-discipleship-dialog'
import { LocationsSection } from '@/components/discipulados/locations-section'
import { DepartmentTeamCard } from '@/components/configuracoes/department-team-card'
import { EncaminharDialog } from '@/components/gca/encaminhar-dialog'
import { DeleteGcaButton } from '@/components/discipulados/delete-gca-button'
import { RequestActions } from '@/components/gca/request-actions'
import { FULL_ACCESS } from '@/lib/roles'
import { GraduationCap, ArrowRightLeft, Inbox, ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function DiscipuladosPage() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return null
  if (!profile?.church_id) return null

  const canManageDept = [...FULL_ACCESS, 'discipleship_supervisor'].includes(profile.role)
  // Quem não é gestão do departamento (nem viewer) só vê os GCAs que lidera/supervisiona
  const seesAll = [...FULL_ACCESS, 'discipleship_supervisor', 'viewer'].includes(profile.role)

  let gcaQuery = supabase
    .from('discipleships')
    .select('*, leader:profiles!discipleships_leader_id_fkey(full_name), leader2:profiles!discipleships_leader2_id_fkey(full_name), supervisor:profiles!discipleships_supervisor_id_fkey(full_name), location:gca_locations(name, location_type, host_name)')
    .eq('church_id', profile.church_id)
    .order('name')

  if (!seesAll) {
    gcaQuery = gcaQuery.or(`leader_id.eq.${profile.id},leader2_id.eq.${profile.id},supervisor_id.eq.${profile.id}`)
  }

  const { data: discipleships } = await gcaQuery

  // Caixa de encaminhamentos (só gestão): concluintes de NM aguardando GCA
  // + solicitações pendentes de inclusão/transferência
  let concluintes: any[] = []
  let pendingRequests: any[] = []
  if (canManageDept) {
    const [{ data: conc }, { data: reqs }] = await Promise.all([
      supabase
        .from('people')
        .select('id, full_name, phone, latitude, longitude, neighborhood, city')
        .eq('church_id', profile.church_id)
        .eq('status', 'concluiu_novos_membros')
        .order('full_name'),
      supabase
        .from('gca_requests')
        .select('id, request_type, reason, created_at, person:people(id, full_name), target:discipleships!gca_requests_target_discipleship_id_fkey(name), from:discipleships!gca_requests_from_discipleship_id_fkey(name), requester:profiles!gca_requests_requested_by_fkey(full_name)')
        .eq('church_id', profile.church_id)
        .eq('status', 'pendente')
        .order('created_at'),
    ])
    concluintes = conc || []
    pendingRequests = reqs || []
  }

  // Member counts
  const ids = discipleships?.map(d => d.id) || []
  const { data: memberCounts } = await supabase
    .from('discipleship_members')
    .select('discipleship_id, status')
    .in('discipleship_id', ids)
    .neq('status', 'inativo')

  const memberMap: Record<string, number> = {}
  const careMap: Record<string, number> = {}
  memberCounts?.forEach(m => {
    memberMap[m.discipleship_id] = (memberMap[m.discipleship_id] || 0) + 1
    if (m.status === 'em_acompanhamento' || m.status === 'situacao_sensivel') {
      careMap[m.discipleship_id] = (careMap[m.discipleship_id] || 0) + 1
    }
  })

  const totalMembers = Object.values(memberMap).reduce((a, b) => a + b, 0)
  const totalNeedCare = Object.values(careMap).reduce((a, b) => a + b, 0)
  const activeGroups = discipleships?.filter(d => d.status === 'ativo') || []

  const dayLabels: Record<string, string> = {
    domingo: 'Dom', segunda: 'Seg', terca: 'Ter', quarta: 'Qua',
    quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb',
  }

  return (
    <div>
      <Header title="GCA" description="Grupos de Crescimento e Acompanhamento" userName={profile.full_name} userRole={profile.role} />

      <div className="p-6 space-y-6">
        {/* Info banner */}
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-start gap-3">
          <Home className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-violet-800">Foco em Acompanhamento Pastoral</p>
            <p className="text-sm text-violet-600">Os GCAs registram observações e status espiritual. Não há controle de presença ou faltas.</p>
          </div>
        </div>

        {/* Caixa de Encaminhamentos (gestão) */}
        {canManageDept && (pendingRequests.length > 0 || concluintes.length > 0) && (
          <div className="rounded-2xl border border-violet-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-violet-50/50">
              <Inbox className="h-4 w-4 text-violet-600" />
              <h2 className="text-base font-bold text-slate-900">Caixa de Encaminhamentos</h2>
            </div>

            {/* Solicitações pendentes */}
            {pendingRequests.length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Solicitações aguardando sua aprovação ({pendingRequests.length})
                </p>
                <div className="space-y-2">
                  {pendingRequests.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.person?.full_name}</p>
                        <p className="text-xs text-slate-600">
                          {r.request_type === 'transferencia'
                            ? <>🔄 Transferir de <strong>{r.from?.name || '—'}</strong> para <strong>{r.target?.name}</strong></>
                            : <>➕ Incluir no <strong>{r.target?.name}</strong> (sem NM concluído)</>}
                          {r.requester?.full_name && <span className="text-slate-400"> · por {r.requester.full_name}</span>}
                        </p>
                        {r.reason && <p className="text-xs text-slate-400 italic mt-0.5">&ldquo;{r.reason}&rdquo;</p>}
                      </div>
                      <RequestActions requestId={r.id} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Concluintes de NM aguardando GCA */}
            {concluintes.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" /> Concluíram Novos Membros — aguardando GCA ({concluintes.length})
                </p>
                <div className="space-y-2">
                  {concluintes.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/pessoas/${c.id}`} className="text-sm font-semibold text-slate-900 hover:text-violet-600 truncate block">{c.full_name}</Link>
                        <p className="text-xs text-slate-400">{[c.neighborhood, c.city].filter(Boolean).join(', ') || 'sem endereço'}</p>
                      </div>
                      <EncaminharDialog
                        personId={c.id}
                        personName={c.full_name}
                        personLat={c.latitude}
                        personLng={c.longitude}
                        churchId={profile.church_id}
                        trigger="link"
                        label="Encaminhar"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'GCAs Ativos', value: activeGroups.length, icon: Home, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Pessoas em GCA', value: totalMembers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Precisam de Cuidado', value: totalNeedCare, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
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

        {/* Locais + Equipe (gestão do departamento) */}
        {canManageDept && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <LocationsSection churchId={profile.church_id} canEdit={canManageDept} />
            <DepartmentTeamCard
              churchId={profile.church_id}
              currentUserId={profile.id}
              title="Equipe de GCA"
              description="Supervisores e líderes de GCA. Ao criar um GCA, você vincula o líder a um local."
              deptRoles={['discipleship_supervisor', 'discipleship_leader']}
              assignRoles={FULL_ACCESS.includes(profile.role) ? ['discipleship_supervisor', 'discipleship_leader'] : ['discipleship_leader']}
              canEdit={canManageDept}
              moduleKey="discipulados"
              moduleLabel="GCA"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-900">GCAs</h2>
          <div className="flex items-center gap-2">
            {canManageDept && (
              <Link
                href="/discipulados/pesquisas"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ClipboardList className="h-4 w-4" /> Pesquisas
              </Link>
            )}
            {canManageDept && <NewDiscipleshipDialog churchId={profile.church_id} userId={profile.id} />}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GCA</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Local / Dia</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Precisam Cuidado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {discipleships && discipleships.length > 0 ? (
                  discipleships.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-slate-900">{d.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {(() => {
                          const second = d.leader2?.full_name || d.leader2_name
                          if (d.leader?.full_name && second) return <span>👫 {d.leader.full_name.split(' ')[0]} & {second.split(' ')[0]}</span>
                          return d.leader?.full_name || '—'
                        })()}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{d.supervisor?.full_name || '—'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {d.location ? (
                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <span>{d.location.location_type === 'igreja' ? '⛪' : '🏠'}</span>
                              <span>{d.location.name}</span>
                            </div>
                          ) : d.neighborhood ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <MapPin className="h-3 w-3" />
                              <span>{d.neighborhood}</span>
                            </div>
                          ) : null}
                          {d.location?.host_name && (
                            <span className="text-slate-400 text-xs block">Anfitrião: {d.location.host_name}</span>
                          )}
                          {d.day_of_week && (
                            <span className="text-slate-400 text-xs">
                              {dayLabels[d.day_of_week]} {d.time_start ? d.time_start.slice(0, 5) : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{memberMap[d.id] || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        {careMap[d.id] > 0 ? (
                          <Badge variant="warning">{careMap[d.id]} ⚠️</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === 'ativo' ? 'success' : 'outline'}>
                          {d.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link href={`/discipulados/${d.id}`}>
                            <Button variant="ghost" size="sm">Acompanhar</Button>
                          </Link>
                          {canManageDept && (
                            <DeleteGcaButton
                              gcaId={d.id}
                              gcaName={d.name}
                              memberCount={memberMap[d.id] || 0}
                              compact
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <Home className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhum GCA cadastrado</p>
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
