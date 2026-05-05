import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, Heart, BookOpen, Home, TrendingUp,
  UserCheck, AlertCircle, Star
} from 'lucide-react'
import { formatDate, timeAgo } from '@/lib/utils'
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
    supabase.from('discipleship_members').select('*', { count: 'exact', head: true }).eq('status', 'em_acompanhamento'),
    supabase.from('journey_events')
      .select('*, people(full_name, status)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('decisions')
      .select('*, people(full_name, phone), appeals(name, culto_date)')
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

const journeyEventEmoji: Record<string, string> = {
  aceitou_jesus: '🙏',
  cadastrado: '📝',
  entrou_novos_membros: '📚',
  concluiu_novos_membros: '🎓',
  entrou_discipulado: '🏠',
  inicio_acompanhamento: '👁️',
  liberado_para_servir: '✅',
  passou_a_servir: '⭐',
  observacao: '📌',
  inativado: '⏸️',
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

  const kpis = [
    { label: 'Total de Pessoas', value: stats.totalPeople, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', href: '/pessoas' },
    { label: 'Novos Convertidos', value: stats.totalNew, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50', href: '/conselheiros' },
    { label: 'Em Novos Membros', value: stats.inNewMembers, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', href: '/novos-membros' },
    { label: 'Em Discipulado', value: stats.inDiscipleship, icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/discipulados' },
    { label: 'Servindo', value: stats.serving, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', href: '/pessoas?status=servindo' },
    { label: 'Precisam de Cuidado', value: stats.needsCare, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', href: '/discipulados?filter=acompanhamento' },
  ]

  return (
    <div>
      <Header
        title="Dashboard"
        description={`Visão geral — ${profile?.churches?.name || 'Igreja'}`}
        userName={profile?.full_name}
        userRole={profile?.role}
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Link key={kpi.label} href={kpi.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bg} mb-3`}>
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">{kpi.label}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Journey funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600" />
                Funil da Jornada Espiritual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Novos convertidos', value: stats.totalNew, color: 'bg-pink-500', max: stats.totalPeople },
                  { label: 'Em Novos Membros', value: stats.inNewMembers, color: 'bg-blue-500', max: stats.totalPeople },
                  { label: 'Em Discipulado', value: stats.inDiscipleship, color: 'bg-emerald-500', max: stats.totalPeople },
                  { label: 'Servindo', value: stats.serving, color: 'bg-amber-500', max: stats.totalPeople },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${item.color} transition-all`}
                        style={{ width: item.max > 0 ? `${Math.round((item.value / item.max) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
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
                <p className="text-sm text-slate-400 py-4 text-center">Nenhuma decisão registrada</p>
              ) : (
                <div className="space-y-3">
                  {recentDecisions.map((decision: any) => (
                    <div key={decision.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{decision.people?.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{decision.appeals?.name}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant={decision.decision_type === 'aceitou_jesus' ? 'default' : 'secondary'}>
                          {decision.decision_type === 'aceitou_jesus' ? 'Jesus' : decision.decision_type}
                        </Badge>
                      </div>
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
              Atividade Recente — Jornadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentJourney.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Nenhuma atividade registrada</p>
            ) : (
              <div className="space-y-2">
                {recentJourney.map((event: any) => (
                  <div key={event.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 transition-colors">
                    <span className="text-lg">{journeyEventEmoji[event.event_type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{event.people?.full_name}</span>
                        {' '}&mdash; {event.event_type.replace(/_/g, ' ')}
                      </p>
                      {event.description && (
                        <p className="text-xs text-slate-500 truncate">{event.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {event.people?.status && (
                        <Badge variant={statusBadgeVariant[event.people.status as PersonStatus] || 'secondary'}>
                          {PERSON_STATUS_LABELS[event.people.status as PersonStatus]}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(event.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
