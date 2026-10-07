import { getSessionProfile } from '@/lib/get-profile'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart, UserPlus, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatPhone } from '@/lib/utils'
import { NewDecisionDialog } from '@/components/conselheiros/new-decision-dialog'
import { EditAppealDialog, DeleteAppealButton, DeleteDecisionButton } from '@/components/conselheiros/appeal-actions'

export default async function AppealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return null
  const [{ data: appeal }, { data: decisions }] = await Promise.all([
    supabase.from('appeals').select('*').eq('id', id).single(),
    supabase.from('decisions')
      .select('*, people(id, full_name, phone, status), profiles(full_name)')
      .eq('appeal_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!appeal) notFound()

  const decisionTypeLabels: Record<string, string> = {
    aceitou_jesus: '🙏 Aceitou Jesus',
    reconciliacao: '🤝 Reconciliação',
    batismo: '💧 Batismo',
    outro: '📌 Outro',
  }

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/conselheiros">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Conselheiros
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{appeal.name}</h1>
            <p className="text-sm text-slate-500">
              {formatDate(appeal.culto_date)}
              {appeal.preacher && ` · Pregador: ${appeal.preacher}`}
              {appeal.theme && ` · ${appeal.theme}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="info">{appeal.total_decisions} decisão(ões)</Badge>
            {profile && ['super_admin', 'pastor', 'coordinator', 'supervisor', 'counselor_leader', 'counselor_full'].includes(profile.role) && (
              <>
                <EditAppealDialog appeal={appeal} />
                <DeleteAppealButton appealId={id} totalDecisions={appeal.total_decisions} />
              </>
            )}
            {profile && <NewDecisionDialog appealId={id} churchId={profile.church_id} userId={profile.id} />}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              Decisões Registradas
            </CardTitle>
          </CardHeader>
          {/* Celular: decisões em cartões */}
          <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
            {decisions && decisions.length > 0 ? decisions.map((d: any) => (
              <div key={d.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/pessoas/${d.people?.id}`} className="font-semibold text-slate-900 min-w-0 truncate">{d.people?.full_name}</Link>
                  <Badge variant={d.decision_type === 'aceitou_jesus' ? 'default' : 'secondary'} className="flex-shrink-0">
                    {decisionTypeLabels[d.decision_type] || d.decision_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap text-xs text-slate-500">
                  {d.people?.phone && (
                    <a href={`https://wa.me/55${d.people.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <Phone className="h-3 w-3" /> {formatPhone(d.people.phone)}
                    </a>
                  )}
                  {d.first_time && <span className="text-emerald-600 font-semibold">1ª vez</span>}
                  {d.profiles?.full_name && <span>por {d.profiles.full_name}</span>}
                </div>
                {d.notes && <p className="text-xs text-slate-500 mt-1">{d.notes}</p>}
                {profile && ['super_admin', 'pastor', 'coordinator', 'supervisor', 'counselor_leader', 'counselor_full'].includes(profile.role) && (
                  <div className="mt-1.5"><DeleteDecisionButton decisionId={d.id} /></div>
                )}
              </div>
            )) : (
              <div className="py-12 text-center text-slate-400">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Nenhuma decisão registrada</p>
              </div>
            )}
          </div>

          {/* Computador: tabela */}
          <CardContent className="p-0 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>1ª vez</TableHead>
                  <TableHead>Conselheiro</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions && decisions.length > 0 ? (
                  decisions.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link href={`/pessoas/${d.people?.id}`} className="font-medium text-slate-900 hover:text-violet-600">
                          {d.people?.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {d.people?.phone ? (
                          <a href={`https://wa.me/55${d.people.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-slate-600 hover:text-green-600 text-sm">
                            <Phone className="h-3 w-3" />
                            {formatPhone(d.people.phone)}
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.decision_type === 'aceitou_jesus' ? 'default' : 'secondary'}>
                          {decisionTypeLabels[d.decision_type] || d.decision_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.first_time ? <Badge variant="success">Sim</Badge> : <Badge variant="outline">Não</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{d.profiles?.full_name || '—'}</TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs truncate">{d.notes || '—'}</TableCell>
                      <TableCell>
                        {profile && ['super_admin', 'pastor', 'coordinator', 'supervisor', 'counselor_leader', 'counselor_full'].includes(profile.role) && (
                          <DeleteDecisionButton decisionId={d.id} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma decisão registrada</p>
                      <p className="text-xs mt-1">Clique em &ldquo;Registrar Decisão&rdquo; para adicionar</p>
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
