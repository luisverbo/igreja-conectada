import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, UserPlus, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CreateChurchDialog } from '@/components/admin/create-church-dialog'

export default async function AdminPage() {
  const admin = createAdminClient()

  // Fetch all churches
  const { data: churches } = await admin
    .from('churches')
    .select('id, name, city, state, pastor_name, email, phone, created_at')
    .order('created_at', { ascending: false })

  // Fetch user counts per church
  const { data: profiles } = await admin
    .from('profiles')
    .select('church_id, role, is_active')

  // Fetch people counts per church
  const { data: people } = await admin
    .from('people')
    .select('church_id, status')

  // Build stats per church
  const statsMap: Record<string, {
    total_users: number
    active_users: number
    total_people: number
    novos: number
  }> = {}

  profiles?.forEach(p => {
    if (!p.church_id) return
    if (!statsMap[p.church_id]) statsMap[p.church_id] = { total_users: 0, active_users: 0, total_people: 0, novos: 0 }
    statsMap[p.church_id].total_users++
    if (p.is_active) statsMap[p.church_id].active_users++
  })

  people?.forEach(p => {
    if (!p.church_id) return
    if (!statsMap[p.church_id]) statsMap[p.church_id] = { total_users: 0, active_users: 0, total_people: 0, novos: 0 }
    statsMap[p.church_id].total_people++
    if (p.status === 'novo') statsMap[p.church_id].novos++
  })

  const totalChurches = churches?.length || 0
  const totalUsers = profiles?.length || 0
  const totalPeople = people?.length || 0

  return (
    <div>
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Igrejas Cadastradas</h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie todas as igrejas da plataforma</p>
          </div>
          <CreateChurchDialog />
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Igrejas', value: totalChurches, icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Usuários do Sistema', value: totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pessoas Acompanhadas', value: totalPeople, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <Card key={s.label}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                    <Icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                    <p className="text-sm text-slate-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Churches list */}
        <div className="space-y-3">
          {churches && churches.length > 0 ? churches.map(church => {
            const stats = statsMap[church.id] || { total_users: 0, active_users: 0, total_people: 0, novos: 0 }
            return (
              <Card key={church.id} className="hover:border-violet-200 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Icon */}
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
                        <Building2 className="h-6 w-6 text-violet-600" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900">{church.name}</h2>
                          <Badge variant="success" className="text-xs">Ativa</Badge>
                        </div>
                        {(church.city || church.state) && (
                          <p className="text-sm text-slate-500 mt-0.5">
                            {[church.city, church.state].filter(Boolean).join(' – ')}
                          </p>
                        )}
                        {church.pastor_name && (
                          <p className="text-sm text-slate-500">Pastor: {church.pastor_name}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          Cadastrada em {formatDate(church.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-shrink-0 flex items-center gap-6 text-center">
                      <div>
                        <p className="text-xl font-bold text-slate-900">{stats.total_users}</p>
                        <p className="text-xs text-slate-400">Usuários</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900">{stats.total_people}</p>
                        <p className="text-xs text-slate-400">Pessoas</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-pink-600">{stats.novos}</p>
                        <p className="text-xs text-slate-400">Novos</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact row */}
                  {(church.email || church.phone) && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      {church.email && <span>{church.email}</span>}
                      {church.phone && <span>{church.phone}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          }) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma igreja cadastrada ainda.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
