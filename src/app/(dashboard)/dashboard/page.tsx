import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, Heart, BookOpen, Home, TrendingUp,
  UserCheck, AlertCircle, Star, ArrowUpRight
} from 'lucide-react'
import { timeAgo, getInitials } from '@/lib/utils'
import { PERSON_STATUS_LABELS, type PersonStatus } from '@/lib/types'
import Link from 'next/link'

async function getDashboardData(churchId: string) {
  const supabase = await createClient()

  const [
    { count: totalPeople },
    { count: totalNew },
    { count: inNewMembers },
    { count: inDiscipleship },
    { count: serving },
    { count: needsCare },
    { data: recentJourney },
    { data: recentDecisions },
  ] = await Promise.all([
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'novo'),
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'em_novos_membros'),
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('church_id', churchId).in('status', ['em_discipulado', 'em_acompanhamento']),
    supabase.from('people').select('*', { count: 'exact', head: true }).eq('church_id', churchId).eq('status', 'servindo'),
    supabase.from('discipleship_members')
      .select('*, discipleships!inner(church_id)', { count: 'exact', head: true })
      .eq('status', 'em_acompanhamento')
      .eq('discipleships.church_id', churchId),
    supabase.from('journey_events')
      .select('*, people!inner(full_name, status, church_id)')
      .eq('people.church_id', churchId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('decisions')
      .select('*, people!inner(full_name, phone, church_id), appeals(name, culto_date)')
      .eq('people.church_id', churchId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    stats: {
      totalPeople: totalPeople || 0,
      totalNew: totalNew || 0,
      inNewMembers: inNewMembers || 0,
      inDiscipleship: inDiscipleship || 0,
      serving: serving || 0,
      needsCare: needsCare || 0,
    },
    recentJourney: recentJourney || [],
    recentDecisions: recentDecisions || [],
  }
}

const statusBadgeVariant: Record<PersonStatus, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline'> = {
  novo: 'secondary',
  em_novos_membros: 'info',
  concluiu_novos_membros: 'info',
  em_discipulado: 'default',
  em_acompanhamento: 'warning',
  servindo: 'success',
  inativo: 'outline',
}

const journeyEventMeta: Record<string, { emoji: string; label: string; bg: string }> = {
  aceitou_jesus: { emoji: '🙏', label: 'aceitou Jesus', bg: 'bg-pink-50' },
  cadastrado: { emoji: '📝', label: 'foi cadastrado(a)', bg: 'bg-slate-100' },
  entrou_novos_membros: { emoji: '📚', label: 'entrou nos Novos Membros', bg: 'bg-blue-50' },
  concluiu_novos_membros: { emoji: '🎓', label: 'concluiu os Novos Membros', bg: 'bg-emerald-50' },
  entrou_discipulado: { emoji: '🏠', label: 'entrou no discipulado', bg: 'bg-violet-50' },
  inicio_acompanhamento: { emoji: '👁️', label: 'iniciou acompanhamento pastoral', bg: 'bg-amber-50' },
  liberado_para_servir: { emoji: '✅', label: 'foi liberado(a) para servir', bg: 'bg-emerald-50' },
  passou_a_servir: { emoji: '⭐', label: 'começou a servir', bg: 'bg-amber-50' },
  observacao: { emoji: '📌', label: 'recebeu uma observação', bg: 'bg-slate-100' },
  inativado: { emoji: '⏸️', label: 'foi inativado(a)', bg: 'bg-slate-100' },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, churches(name)')
    .eq('id', user.id)
    .single()

  const churchId = profile?.church_id
  if (!churchId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <h2 className="font-semibold mb-2">Perfil não configurado</h2>
          <p className="text-sm">Seu usuário não está vinculado a uma igreja. Contate o administrador.</p>
        </div>
      </div>
    )
  }

  const { stats, recentJourney, recentDecisions } = await getDashboardData(churchId)

  const firstName = (profile?.full_name || '').split(' ')[0]
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const kpis = [
    { label: 'Total de Pessoas', value: stats.totalPeople, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', href: '/pessoas' },
    { label: 'Novos Convertidos', value: stats.totalNew, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50', href: '/pessoas?status=novo' },
    { label: 'Em Novos Membros', value: stats.inNewMembers, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', href: '/novos-membros' },
    { label: 'Em Discipulado', value: stats.inDiscipleship, icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/discipulados' },
    { label: 'Servindo', value: stats.serving, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', href: '/pessoas?status=servindo' },
    { label: 'Precisam de Cuidado', value: stats.needsCare, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', href: '/discipulados' },
  ]

  const funnelSteps = [
    { label: 'Novos convertidos', value: stats.totalNew, gradient: 'from-pink-500 to-rose-400' },
    { label: 'Em Novos Membros', value: stats.inNewMembers, gradient: 'from-blue-500 to-sky-400' },
    { label: 'Em Discipulado', value: stats.inDiscipleship, gradient: 'from-emerald-500 to-teal-400' },
    { label: 'Servindo', value: stats.serving, gradient: 'from-amber-500 to-yellow-400' },
  ]

  return (
    <div>
      <Header
        title="Dashboard"
        description={`Visão geral — ${profile?.churches?.name || 'Igreja'}`}
        userName={profile?.full_name}
        userRole={profile?.role}
      />

      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-6 sm:p-8">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-2xl" />
          <div className="relative">
            <p className="text-violet-200 text-sm capitalize">{today}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              A paz, {firstName}! 👋
            </h2>
            <p className="text-violet-200 text-sm mt-1 max-w-lg">
              {stats.totalNew > 0
                ? `Você tem ${stats.totalNew} novo(s) convertido(s) aguardando os próximos passos da jornada.`
                : 'Tudo em dia por aqui. Que tal conferir os relatórios?'}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Link key={kpi.label} href={kpi.href}>
                <div className="group rounded-2xl border border-slate-200 bg-white p-4 h-full transition-all hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg} mb-3`}>
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-violet-500 transition-colors" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-tight">{kpi.label}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Journey funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600" />
                Funil da Jornada Espiritual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelSteps.map((item) => {
                  const pct = stats.totalPeople > 0 ? Math.round((item.value / stats.totalPeople) * 100) : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between items-baseline text-sm mb-1.5">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {item.value}
                          <span className="text-xs font-medium text-slate-400 ml-1">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${item.gradient} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent decisions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-600" />
                Últimas Decisões
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDecisions.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Nenhuma decisão registrada ainda</p>
              ) : (
                <div className="space-y-2">
                  {recentDecisions.map((decision: any) => (
                    <div key={decision.id} className="flex items-center gap-3 rounded-xl bg-slate-50 hover:bg-violet-50/60 transition-colors p-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-400 text-white text-xs font-bold">
                        {getInitials(decision.people?.full_name || '?')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{decision.people?.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{decision.appeals?.name}</p>
                      </div>
                      <Badge variant={decision.decision_type === 'aceitou_jesus' ? 'default' : 'secondary'}>
                        {decision.decision_type === 'aceitou_jesus' ? '🙏 Jesus' : decision.decision_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent journey events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-violet-600" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentJourney.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-1">
                {recentJourney.map((event: any) => {
                  const meta = journeyEventMeta[event.event_type] || { emoji: '📌', label: event.event_type.replace(/_/g, ' '), bg: 'bg-slate-100' }
                  return (
                    <div key={event.id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-50 transition-colors">
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base ${meta.bg}`}>
                        {meta.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">{event.people?.full_name}</span>
                          {' '}{meta.label}
                        </p>
                        {event.description && (
                          <p className="text-xs text-slate-400 truncate">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {event.people?.status && (
                          <span className="hidden sm:inline-flex">
                            <Badge variant={statusBadgeVariant[event.people.status as PersonStatus] || 'secondary'}>
                              {PERSON_STATUS_LABELS[event.people.status as PersonStatus]}
                            </Badge>
                          </span>
                        )}
                        <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(event.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
