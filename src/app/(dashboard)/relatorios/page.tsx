import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Users, Heart, BookOpen, Home, Star, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ChartsSection } from '@/components/relatorios/charts-section'
import { MapSection } from '@/components/relatorios/map-section'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('church_id, full_name, role').eq('id', user.id).single()
  if (!profile?.church_id) return null

  const cid = profile.church_id

  const [
    { data: people },
    { data: appeals },
    { data: discipleships },
    { data: discipleshipMembers },
    { data: enrollments },
    { data: observations },
  ] = await Promise.all([
    supabase
      .from('people')
      .select('status, gender, birth_date, origin, neighborhood, latitude, longitude, accepted_jesus_at, created_at, can_serve, full_name, id')
      .eq('church_id', cid),
    supabase
      .from('appeals')
      .select('culto_date, total_decisions')
      .eq('church_id', cid)
      .order('culto_date', { ascending: false })
      .limit(12),
    supabase
      .from('discipleships')
      .select('id, name, status, day_of_week, latitude, longitude, leader_id')
      .eq('church_id', cid),
    supabase
      .from('discipleship_members')
      .select('discipleship_id, status, person_id')
      .eq('status', 'em_acompanhamento'),
    supabase.from('new_members_enrollments').select('completed, class_id'),
    supabase
      .from('discipleship_observations')
      .select('observation_type, needs_care, observation_date, people(full_name), profiles(full_name)')
      .eq('needs_care', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // People by status
  const byStatus: Record<string, number> = {}
  people?.forEach(p => {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1
  })

  // Total decisions by month (last 6)
  const decisionsByMonth: Record<string, number> = {}
  appeals?.forEach(a => {
    const month = a.culto_date?.slice(0, 7) || ''
    decisionsByMonth[month] = (decisionsByMonth[month] || 0) + (a.total_decisions || 0)
  })

  // Care needed
  const careNeeded = discipleshipMembers?.length || 0

  // Completion rate novos membros
  const totalEnrolled = enrollments?.length || 0
  const totalCompleted = enrollments?.filter(e => e.completed).length || 0
  const completionRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0

  const statusLabels: Record<string, string> = {
    novo: 'Novos Convertidos',
    em_novos_membros: 'Em Novos Membros',
    concluiu_novos_membros: 'Concluiu Novos Membros',
    em_discipulado: 'Em Discipulado',
    em_acompanhamento: 'Em Acompanhamento',
    servindo: 'Servindo',
    inativo: 'Inativos',
  }

  const statusColors: Record<string, string> = {
    novo: 'bg-pink-500',
    em_novos_membros: 'bg-blue-500',
    concluiu_novos_membros: 'bg-blue-700',
    em_discipulado: 'bg-violet-500',
    em_acompanhamento: 'bg-amber-500',
    servindo: 'bg-emerald-500',
    inativo: 'bg-slate-300',
  }

  const totalPeople = people?.length || 0
  const servingCount = byStatus['servindo'] || 0
  const servingRate = totalPeople > 0 ? Math.round((servingCount / totalPeople) * 100) : 0

  const months = Object.keys(decisionsByMonth).sort().slice(-6)

  // Prepare map data
  const peopleMarkers = (people || [])
    .filter(p => p.latitude != null && p.longitude != null)
    .map(p => ({
      id: p.id,
      full_name: p.full_name,
      status: p.status,
      neighborhood: p.neighborhood ?? null,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
    }))

  const discipleshipMarkers = (discipleships || [])
    .filter(d => d.latitude != null && d.longitude != null)
    .map(d => ({
      id: d.id,
      name: d.name,
      leader_name: null as string | null,
      day_of_week: d.day_of_week ?? null,
      latitude: d.latitude as number,
      longitude: d.longitude as number,
    }))

  // Prepare chart data (subset of fields)
  const chartPeople = (people || []).map(p => ({
    status: p.status,
    gender: p.gender ?? null,
    birth_date: p.birth_date ?? null,
    origin: p.origin ?? null,
    neighborhood: p.neighborhood ?? null,
  }))

  return (
    <div>
      <Header title="Relatórios" description="Análise da jornada espiritual e crescimento" userName={profile.full_name} userRole={profile.role} />

      <div className="p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de Pessoas', value: totalPeople, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Taxa de Conclusão NM', value: `${completionRate}%`, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Precisam de Cuidado', value: careNeeded, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Taxa de Servindo', value: `${servingRate}%`, icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} mb-2`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Section */}
        <ChartsSection people={chartPeople} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Journey funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600" />
                Funil de Jornada Espiritual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(statusLabels).map(([status, label]) => {
                const count = byStatus[status] || 0
                const pct = totalPeople > 0 ? Math.round((count / totalPeople) * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-semibold text-slate-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full transition-all ${statusColors[status] || 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Decisions by month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                Decisões por Mês (últimos 6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {months.length > 0 ? (
                <div className="space-y-2">
                  {months.reverse().map(month => {
                    const count = decisionsByMonth[month] || 0
                    const maxVal = Math.max(...Object.values(decisionsByMonth))
                    const pct = maxVal > 0 ? (count / maxVal) * 100 : 0
                    return (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16 flex-shrink-0">{month}</span>
                        <div className="flex-1 h-6 rounded-lg bg-slate-100 overflow-hidden">
                          <div
                            className="h-6 rounded-lg bg-pink-400 flex items-center pl-2 transition-all"
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          >
                            <span className="text-xs font-medium text-white">{count}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Nenhuma decisão registrada</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map Section */}
        <MapSection people={peopleMarkers} discipleships={discipleshipMarkers} />

        {/* Care alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Alertas de Cuidado Pastoral
            </CardTitle>
          </CardHeader>
          <CardContent>
            {observations && observations.length > 0 ? (
              <div className="space-y-2">
                {observations.map((obs: any) => (
                  <div key={obs.id || Math.random()} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-900">{obs.people?.full_name}</p>
                      <p className="text-sm text-amber-700 mt-0.5">{obs.description}</p>
                      {obs.profiles?.full_name && (
                        <p className="text-xs text-amber-500 mt-1">Registrado por {obs.profiles.full_name}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Badge variant="warning">⚠️ Precisa Cuidado</Badge>
                      <p className="text-xs text-amber-500 mt-1 text-right">{formatDate(obs.observation_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">
                Nenhum alerta de cuidado pastoral ativo
              </p>
            )}
          </CardContent>
        </Card>

        {/* Discipleship status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4 text-violet-600" />
              Discipulados Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {discipleships && discipleships.length > 0 ? (
              <div className="space-y-3">
                {discipleships.filter(d => d.status === 'ativo').map((d: any) => (
                  <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">{d.name}</p>
                      <Badge variant={d.status === 'ativo' ? 'success' : 'outline'}>{d.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum discipulado cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
