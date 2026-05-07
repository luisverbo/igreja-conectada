import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Heart, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { NewAppealDialog } from '@/components/conselheiros/new-appeal-dialog'
import { CounselorNewConvert } from '@/components/conselheiros/counselor-new-convert'

export default async function ConselheirosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('church_id, full_name, role').eq('id', user.id).single()
  if (!profile?.church_id) return null

  if (profile.role === 'counselor') {
    return <CounselorNewConvert churchId={profile.church_id} userId={user.id} userName={profile.full_name} />
  }

  const { data: appeals } = await supabase
    .from('appeals')
    .select('*')
    .eq('church_id', profile.church_id)
    .order('culto_date', { ascending: false })
    .limit(50)

  // Stats
  const totalDecisions = appeals?.reduce((sum, a) => sum + (a.total_decisions || 0), 0) || 0
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const recentAppeals = appeals?.filter(a => new Date(a.culto_date) >= thisMonth) || []
  const recentDecisions = recentAppeals.reduce((sum, a) => sum + (a.total_decisions || 0), 0)

  const cultoTypeLabels: Record<string, string> = {
    domingo_manha: 'Domingo Manhã',
    domingo_noite: 'Domingo Noite',
    quarta: 'Quarta-feira',
    especial: 'Culto Especial',
    outro: 'Outro',
  }

  return (
    <div>
      <Header title="Conselheiros" description="Cultos, apelos e decisões" userName={profile.full_name} userRole={profile.role} />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total de Cultos', value: appeals?.length || 0, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Total de Decisões', value: totalDecisions, icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50' },
            { label: 'Decisões este mês', value: recentDecisions, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((s) => {
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
          <h2 className="text-base font-semibold text-slate-900">Cultos Registrados</h2>
          <NewAppealDialog churchId={profile.church_id} userId={user.id} />
        </div>

        {/* Appeals table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Culto / Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Pregador</TableHead>
                  <TableHead>Decisões</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appeals && appeals.length > 0 ? (
                  appeals.map((appeal) => (
                    <TableRow key={appeal.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{appeal.name}</p>
                        {appeal.theme && <p className="text-xs text-slate-400">{appeal.theme}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(appeal.culto_date)}</TableCell>
                      <TableCell>
                        {appeal.culto_type && (
                          <Badge variant="secondary">{cultoTypeLabels[appeal.culto_type] || appeal.culto_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{appeal.preacher || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={appeal.total_decisions > 0 ? 'success' : 'outline'}>
                          {appeal.total_decisions} decisão(ões)
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/conselheiros/${appeal.id}`}>
                          <Button variant="ghost" size="sm">Ver decisões</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhum culto registrado ainda</p>
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
