import { createClient } from '@/lib/supabase/server'
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
import { FULL_ACCESS } from '@/lib/roles'

export default async function DiscipuladosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('church_id, full_name, role, id').eq('id', user.id).single()
  if (!profile?.church_id) return null

  const { data: discipleships } = await supabase
    .from('discipleships')
    .select('*, leader:profiles!discipleships_leader_id_fkey(full_name), leader2:profiles!discipleships_leader2_id_fkey(full_name), supervisor:profiles!discipleships_supervisor_id_fkey(full_name), location:gca_locations(name, location_type, host_name)')
    .eq('church_id', profile.church_id)
    .order('name')

  const canManageDept = [...FULL_ACCESS, 'discipleship_supervisor'].includes(profile.role)

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
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">GCAs</h2>
          {canManageDept && <NewDiscipleshipDialog churchId={profile.church_id} userId={profile.id} />}
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
                        <Link href={`/discipulados/${d.id}`}>
                          <Button variant="ghost" size="sm">Acompanhar</Button>
                        </Link>
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
