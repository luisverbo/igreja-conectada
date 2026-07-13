import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Users, Heart, BookOpen, Home, Star, AlertCircle, Zap, Clock, MessageSquare, Radar, Phone } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ChartsSection } from '@/components/relatorios/charts-section'
import { MapSection } from '@/components/relatorios/map-section'
import { NeighborhoodFilter } from '@/components/relatorios/neighborhood-filter'
import Link from 'next/link'

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
    { data: journeyEvents },
    { data: decisions },
    { data: attendance },
    { count: waitlistCount },
    { data: scheduledMessages },
  ] = await Promise.all([
    supabase
      .from('people')
      .select('id, full_name, phone, status, gender, birth_date, origin, neighborhood, city, latitude, longitude, accepted_jesus_at, created_at, assigned_to')
      .eq('church_id', cid),
    supabase
      .from('appeals')
      .select('culto_date, culto_type, total_decisions')
      .eq('church_id', cid)
      .order('culto_date', { ascending: false })
      .limit(24),
    supabase
      .from('discipleships')
      .select('id, name, status, day_of_week, latitude, longitude, leader2_name, leader:profiles!discipleships_leader_id_fkey(full_name), leader2:profiles!discipleships_leader2_id_fkey(full_name)')
      .eq('church_id', cid),
    supabase
      .from('discipleship_members')
      .select('discipleship_id, status, discipleships!inner(church_id)')
      .neq('status', 'inativo')
      .eq('discipleships.church_id', cid),
    supabase
      .from('new_members_enrollments')
      .select('completed, new_members_classes!inner(church_id, status)')
      .eq('new_members_classes.church_id', cid)
      .in('new_members_classes.status', ['ativa', 'concluida']),
    supabase
      .from('discipleship_observations')
      .select('id, description, observation_type, needs_care, observation_date, people!inner(id, full_name, church_id), profiles(full_name)')
      .eq('needs_care', true)
      .eq('people.church_id', cid)
      .order('observation_date', { ascending: false })
      .limit(20),
    supabase
      .from('journey_events')
      .select('person_id, event_type, created_at, people!inner(church_id)')
      .eq('people.church_id', cid)
      .in('event_type', ['aceitou_jesus', 'entrou_novos_membros', 'concluiu_novos_membros', 'entrou_discipulado', 'liberado_para_servir'])
      .limit(5000),
    supabase
      .from('decisions')
      .select('decision_type, first_time, appeals!inner(church_id)')
      .eq('appeals.church_id', cid)
      .limit(2000),
    supabase
      .from('new_members_attendance')
      .select('present, people!inner(church_id)')
      .eq('people.church_id', cid)
      .limit(5000),
    supabase
      .from('enrollment_waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', cid)
      .eq('status', 'aguardando'),
    supabase
      .from('scheduled_messages')
      .select('status')
      .eq('church_id', cid)
      .limit(2000),
  ])

  // ============================================================
  // MÉTRICAS BÁSICAS
  // ============================================================
  const byStatus: Record<string, number> = {}
  people?.forEach(p => { byStatus[p.status] = (byStatus[p.status] || 0) + 1 })
  const totalPeople = people?.length || 0

  const totalEnrolled = enrollments?.length || 0
  const totalCompleted = enrollments?.filter(e => e.completed).length || 0
  const completionRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0

  const careNeeded = discipleshipMembers?.filter(m => m.status === 'em_acompanhamento' || m.status === 'situacao_sensivel').length || 0
  const servingRate = totalPeople > 0 ? Math.round(((byStatus['servindo'] || 0) / totalPeople) * 100) : 0

  // Presença média nos Novos Membros
  const totalAttendance = attendance?.length || 0
  const presentCount = attendance?.filter(a => a.present).length || 0
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null

  // ============================================================
  // FUNIL REAL DE CONVERSÃO (journey_events)
  // ============================================================
  const stageOrder = ['aceitou_jesus', 'entrou_novos_membros', 'concluiu_novos_membros', 'entrou_discipulado', 'liberado_para_servir'] as const
  const stageLabels: Record<string, string> = {
    aceitou_jesus: '🙏 Aceitou Jesus',
    entrou_novos_membros: '📚 Entrou nos Novos Membros',
    concluiu_novos_membros: '🎓 Concluiu Novos Membros',
    entrou_discipulado: '🏠 Entrou no GCA',
    liberado_para_servir: '⭐ Liberado para Servir',
  }

  // Primeiro evento de cada tipo por pessoa
  const personStageDates: Record<string, Record<string, string>> = {}
  journeyEvents?.forEach(ev => {
    if (!personStageDates[ev.person_id]) personStageDates[ev.person_id] = {}
    const existing = personStageDates[ev.person_id][ev.event_type]
    if (!existing || ev.created_at < existing) {
      personStageDates[ev.person_id][ev.event_type] = ev.created_at
    }
  })

  const stageCounts = stageOrder.map(stage => ({
    stage,
    label: stageLabels[stage],
    count: Object.values(personStageDates).filter(stages => stages[stage]).length,
  }))
  const funnelMax = Math.max(stageCounts[0]?.count || 0, 1)

  // Tempo médio entre etapas (dias)
  function avgDaysBetween(fromStage: string, toStage: string): number | null {
    const diffs: number[] = []
    Object.values(personStageDates).forEach(stages => {
      if (stages[fromStage] && stages[toStage]) {
        const days = (new Date(stages[toStage]).getTime() - new Date(stages[fromStage]).getTime()) / 86400000
        if (days >= 0 && days < 730) diffs.push(days)
      }
    })
    if (diffs.length === 0) return null
    return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
  }

  const stageTimes = [
    { label: 'Aceitou Jesus → Novos Membros', days: avgDaysBetween('aceitou_jesus', 'entrou_novos_membros') },
    { label: 'Entrou → Concluiu NM', days: avgDaysBetween('entrou_novos_membros', 'concluiu_novos_membros') },
    { label: 'Concluiu NM → Entrou no GCA', days: avgDaysBetween('concluiu_novos_membros', 'entrou_discipulado') },
    { label: 'Jornada completa (Jesus → Servir)', days: avgDaysBetween('aceitou_jesus', 'liberado_para_servir') },
  ]

  // ============================================================
  // RADAR DE AÇÃO — quem precisa de atenção AGORA
  // ============================================================
  const now = Date.now()
  const daysSince = (d: string | null) => d ? Math.floor((now - new Date(d).getTime()) / 86400000) : null

  // Novos convertidos parados há 14+ dias sem entrar em NM
  const esfriando = (people || [])
    .filter(p => p.status === 'novo')
    .map(p => ({ ...p, dias: daysSince(p.accepted_jesus_at || p.created_at) ?? 0 }))
    .filter(p => p.dias >= 14)
    .sort((a, b) => b.dias - a.dias)

  // Concluíram NM mas não entraram em GCA
  const semGca = (people || []).filter(p => p.status === 'concluiu_novos_membros')

  // Novos sem responsável de acompanhamento
  const semResponsavel = (people || []).filter(p => p.status === 'novo' && !p.assigned_to)

  // ============================================================
  // DECISÕES
  // ============================================================
  const decisionTypeLabels: Record<string, string> = {
    aceitou_jesus: '🙏 Aceitou Jesus',
    reconciliacao: '🤝 Reconciliação',
    batismo: '💧 Batismo',
    outro: '📌 Outro',
  }
  const decisionsByType: Record<string, number> = {}
  let firstTimeCount = 0
  decisions?.forEach(d => {
    decisionsByType[d.decision_type] = (decisionsByType[d.decision_type] || 0) + 1
    if (d.first_time) firstTimeCount++
  })
  const totalDecisions = decisions?.length || 0

  const decisionsByMonth: Record<string, number> = {}
  appeals?.forEach(a => {
    const month = a.culto_date?.slice(0, 7) || ''
    decisionsByMonth[month] = (decisionsByMonth[month] || 0) + (a.total_decisions || 0)
  })
  const months = Object.keys(decisionsByMonth).sort().slice(-6)
  const monthsDesc = [...months].reverse()
  const maxMonthly = Math.max(...Object.values(decisionsByMonth), 1)

  // ============================================================
  // AUTOMAÇÕES (WhatsApp)
  // ============================================================
  const msgStats = { pendente: 0, enviado: 0, falhou: 0 }
  scheduledMessages?.forEach(m => {
    if (m.status in msgStats) msgStats[m.status as keyof typeof msgStats]++
  })

  // ============================================================
  // MAPA — geocoding com cache permanente
  // ============================================================
  const neighborhoodMap: Record<string, { neighborhood: string; city: string; novos: number; membros: number; lat?: number; lng?: number }> = {}
  for (const p of people || []) {
    if (!p.neighborhood && !p.city) continue
    const key = `${p.neighborhood ?? ''}|${p.city ?? ''}`
    if (!neighborhoodMap[key]) {
      neighborhoodMap[key] = { neighborhood: p.neighborhood ?? '', city: p.city ?? '', novos: 0, membros: 0 }
    }
    if (p.status === 'novo') neighborhoodMap[key].novos++
    else neighborhoodMap[key].membros++
    if (p.latitude && p.longitude && !neighborhoodMap[key].lat) {
      neighborhoodMap[key].lat = p.latitude
      neighborhoodMap[key].lng = p.longitude
    }
  }

  // 1) Resolve pelo cache do banco (sem chamadas externas)
  const missing = Object.values(neighborhoodMap).filter(n => !n.lat)
  if (missing.length > 0) {
    const queries = missing.map(n => [n.neighborhood, n.city, 'Brasil'].filter(Boolean).join(', '))
    const { data: cached } = await supabase
      .from('geocode_cache')
      .select('query, latitude, longitude')
      .in('query', queries)
    const cacheMap = new Map((cached || []).map(c => [c.query, c]))
    missing.forEach(n => {
      const q = [n.neighborhood, n.city, 'Brasil'].filter(Boolean).join(', ')
      const hit = cacheMap.get(q)
      if (hit?.latitude) { n.lat = hit.latitude; n.lng = hit.longitude! }
    })
  }

  // 2) Geocodifica no máximo 3 por load (sequencial, respeitando o Nominatim)
  //    e grava no cache — nas próximas visitas vem tudo do banco
  const stillMissing = Object.values(neighborhoodMap).filter(n => !n.lat).slice(0, 3)
  for (const n of stillMissing) {
    const q = [n.neighborhood, n.city, 'Brasil'].filter(Boolean).join(', ')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`,
        { headers: { 'User-Agent': 'IgrejaConectada/1.0' }, next: { revalidate: 86400 } }
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        n.lat = parseFloat(data[0].lat)
        n.lng = parseFloat(data[0].lon)
        await supabase.from('geocode_cache').upsert(
          { query: q, latitude: n.lat, longitude: n.lng },
          { onConflict: 'query' }
        )
      } else {
        // Cache negativo: evita repetir consultas de bairros não encontráveis
        await supabase.from('geocode_cache').upsert(
          { query: q, latitude: null, longitude: null },
          { onConflict: 'query' }
        )
      }
    } catch { /* geocoding é opcional */ }
  }

  const geocodedGroups = Object.values(neighborhoodMap).filter(n => n.lat && n.lng)
  const novosGroups = geocodedGroups
    .filter(n => n.novos > 0)
    .map(n => ({ neighborhood: n.neighborhood, city: n.city, count: n.novos, lat: n.lat as number, lng: n.lng as number }))
  const membrosGroups = geocodedGroups
    .filter(n => n.membros > 0)
    .map(n => ({ neighborhood: n.neighborhood, city: n.city, count: n.membros, lat: n.lat as number, lng: n.lng as number }))

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

  // Só células ATIVAS no mapa, com nome do casal de líderes
  const discipleshipMarkers = (discipleships || [])
    .filter(d => d.status === 'ativo' && d.latitude != null && d.longitude != null)
    .map(d => {
      const l1 = (d.leader as any)?.full_name
      const l2 = (d.leader2 as any)?.full_name || d.leader2_name
      return {
        id: d.id,
        name: d.name,
        leader_name: l1 && l2 ? `${l1.split(' ')[0]} & ${l2.split(' ')[0]}` : l1 ?? null,
        day_of_week: d.day_of_week ?? null,
        latitude: d.latitude as number,
        longitude: d.longitude as number,
      }
    })

  const chartPeople = (people || []).map(p => ({
    status: p.status,
    gender: p.gender ?? null,
    birth_date: p.birth_date ?? null,
    origin: p.origin ?? null,
    neighborhood: p.neighborhood ?? null,
  }))

  const neighborhoodPeople = (people || [])
    .filter(p => p.neighborhood || p.city)
    .map(p => ({
      id: p.id,
      full_name: p.full_name,
      status: p.status,
      phone: p.phone ?? null,
      neighborhood: p.neighborhood ?? null,
      city: p.city ?? null,
    }))

  const statusLabels: Record<string, string> = {
    novo: 'Novos Convertidos',
    em_novos_membros: 'Em Novos Membros',
    concluiu_novos_membros: 'Concluiu Novos Membros',
    em_discipulado: 'Em GCA',
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

  const radarLists = [
    {
      key: 'esfriando',
      title: '🥶 Esfriando',
      subtitle: `Novos convertidos parados há 14+ dias sem entrar em turma`,
      color: 'border-red-200 bg-red-50',
      titleColor: 'text-red-800',
      people: esfriando.map(p => ({ id: p.id, full_name: p.full_name, phone: p.phone, extra: `${p.dias} dias parado` })),
    },
    {
      key: 'sem-gca',
      title: '🏠 Sem GCA',
      subtitle: 'Concluíram Novos Membros mas ainda não entraram em um GCA',
      color: 'border-amber-200 bg-amber-50',
      titleColor: 'text-amber-800',
      people: semGca.map(p => ({ id: p.id, full_name: p.full_name, phone: p.phone, extra: 'Concluiu NM' })),
    },
    {
      key: 'sem-responsavel',
      title: '🤝 Sem responsável',
      subtitle: 'Novos convertidos sem ninguém designado para acompanhar',
      color: 'border-violet-200 bg-violet-50',
      titleColor: 'text-violet-800',
      people: semResponsavel.map(p => ({ id: p.id, full_name: p.full_name, phone: p.phone, extra: 'Sem acompanhamento' })),
    },
  ]

  return (
    <div>
      <Header title="Relatórios" description="O cérebro do sistema — jornada completa de cada pessoa" userName={profile.full_name} userRole={profile.role} />

      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {[
            { label: 'Total de Pessoas', value: totalPeople, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Decisões Registradas', value: totalDecisions, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50' },
            { label: 'Conclusão NM', value: `${completionRate}%`, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Presença média NM', value: attendanceRate !== null ? `${attendanceRate}%` : '—', icon: TrendingUp, color: 'text-sky-600', bg: 'bg-sky-50' },
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
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* RADAR DE AÇÃO — o coração inteligente */}
        <Card className="border-violet-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-violet-600" />
              Radar de Ação
              <span className="text-xs font-normal text-slate-400">— quem precisa de atenção agora</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {radarLists.map(list => (
                <div key={list.key} className={`rounded-xl border ${list.color} p-4`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-sm font-bold ${list.titleColor}`}>{list.title}</p>
                    <span className={`text-lg font-extrabold ${list.titleColor} tabular-nums`}>{list.people.length}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{list.subtitle}</p>
                  {list.people.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">Ninguém aqui — tudo em dia! ✅</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {list.people.slice(0, 15).map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-1.5">
                          <div className="min-w-0">
                            <Link href={`/pessoas/${p.id}`} className="text-xs font-semibold text-slate-800 hover:text-violet-600 truncate block">
                              {p.full_name}
                            </Link>
                            <span className="text-[10px] text-slate-400">{p.extra}</span>
                          </div>
                          {p.phone && (
                            <a
                              href={`https://wa.me/55${p.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-green-600 flex-shrink-0"
                              title="Chamar no WhatsApp"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                      {list.people.length > 15 && (
                        <p className="text-[10px] text-slate-400 text-center">+{list.people.length - 15} pessoas</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FUNIL REAL + TEMPO DE JORNADA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-600" />
                Funil de Conversão Real
                <span className="text-xs font-normal text-slate-400">— quantos chegaram em cada etapa</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stageCounts.map((s, i) => {
                const prev = i > 0 ? stageCounts[i - 1].count : s.count
                const conv = prev > 0 ? Math.round((s.count / prev) * 100) : 0
                const width = Math.round((s.count / funnelMax) * 100)
                return (
                  <div key={s.stage}>
                    <div className="flex justify-between items-baseline text-sm mb-1">
                      <span className="text-slate-600">{s.label}</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {s.count}
                        {i > 0 && (
                          <span className={`text-xs font-semibold ml-1.5 ${conv >= 60 ? 'text-emerald-600' : conv >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
                            {conv}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all"
                        style={{ width: `${Math.max(width, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-slate-400 pt-1">
                O % mostra a conversão da etapa anterior. Verde ≥60% · Âmbar ≥30% · Vermelho &lt;30%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600" />
                Tempo Médio de Jornada
                <span className="text-xs font-normal text-slate-400">— quantos dias entre as etapas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stageTimes.map(t => (
                  <div key={t.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-600">{t.label}</span>
                    <span className="text-sm font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {t.days !== null ? `${t.days} dia${t.days === 1 ? '' : 's'}` : 'sem dados'}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  Calculado com base na jornada real de cada pessoa. Quanto menor o tempo, mais rápido o discipulado está funcionando.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <ChartsSection people={chartPeople} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Status distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-600" />
                Situação Atual
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
                      <span className="font-semibold text-slate-900 tabular-nums">{count} ({pct}%)</span>
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

          {/* Decisions by type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                Decisões por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalDecisions > 0 ? (
                <div className="space-y-3">
                  {Object.entries(decisionsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const pct = Math.round((count / totalDecisions) * 100)
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">{decisionTypeLabels[type] || type}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-pink-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="rounded-lg bg-pink-50 border border-pink-100 px-3 py-2 mt-2">
                    <p className="text-xs text-pink-700">
                      <strong>{totalDecisions > 0 ? Math.round((firstTimeCount / totalDecisions) * 100) : 0}%</strong> foram decisões de primeira vez
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Nenhuma decisão registrada</p>
              )}
            </CardContent>
          </Card>

          {/* Decisions by month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-pink-500" />
                Decisões por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthsDesc.length > 0 ? (
                <div className="space-y-2">
                  {monthsDesc.map(month => {
                    const count = decisionsByMonth[month] || 0
                    const pct = (count / maxMonthly) * 100
                    return (
                      <div key={month} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16 flex-shrink-0">{month}</span>
                        <div className="flex-1 h-6 rounded-lg bg-slate-100 overflow-hidden">
                          <div
                            className="h-6 rounded-lg bg-pink-400 flex items-center pl-2 transition-all"
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          >
                            <span className="text-xs font-medium text-white tabular-nums">{count}</span>
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

        {/* Automações WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              Automações &amp; Fila
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Mensagens enviadas', value: msgStats.enviado, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Aguardando envio', value: msgStats.pendente, color: 'text-amber-600 bg-amber-50' },
                { label: 'Falhas de envio', value: msgStats.falhou, color: 'text-red-600 bg-red-50' },
                { label: 'Fila de espera NM', value: waitlistCount || 0, color: 'text-violet-600 bg-violet-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl ${s.color.split(' ')[1]} px-4 py-3`}>
                  <p className={`text-2xl font-extrabold tabular-nums ${s.color.split(' ')[0]}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {msgStats.falhou > 0 && (
              <p className="text-xs text-red-500 mt-3">
                ⚠️ Há mensagens com falha de envio — verifique se o WhatsApp está conectado em Configurações.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Map Section */}
        <MapSection people={peopleMarkers} discipleships={discipleshipMarkers} novosGroups={novosGroups} membrosGroups={membrosGroups} />

        {/* Neighborhood People Filter */}
        <NeighborhoodFilter people={neighborhoodPeople} />

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
                  <div key={obs.id} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/pessoas/${obs.people?.id}`} className="text-sm font-medium text-amber-900 hover:underline">
                        {obs.people?.full_name}
                      </Link>
                      {obs.description && <p className="text-sm text-amber-700 mt-0.5">{obs.description}</p>}
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

        {/* GCAs Ativos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4 text-violet-600" />
              GCAs Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {discipleships && discipleships.filter(d => d.status === 'ativo').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {discipleships.filter(d => d.status === 'ativo').map((d: any) => {
                  const l1 = d.leader?.full_name
                  const l2 = d.leader2?.full_name || d.leader2_name
                  return (
                    <Link key={d.id} href={`/discipulados/${d.id}`} className="rounded-xl border border-slate-200 p-3 hover:border-violet-300 hover:bg-violet-50/40 transition-colors block">
                      <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {l1 && l2 ? `👫 ${l1.split(' ')[0]} & ${l2.split(' ')[0]}` : l1 || 'Sem líder'}
                      </p>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum GCA ativo</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
