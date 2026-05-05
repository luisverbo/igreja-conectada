import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart, UserPlus, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatPhone } from '@/lib/utils'
import { NewDecisionDialog } from '@/components/conselheiros/new-decision-dialog'

export default async function AppealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('church_id, full_name, role, id').eq('id', user.id).single()

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
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/conselheiros">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Conselheiros
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{appeal.name}</h1>
            <p className="text-sm text-slate-500">
              {formatDate(appeal.culto_date)}
              {appeal.preacher && ` · Pregador: ${appeal.preacher}`}
              {appeal.theme && ` · ${appeal.theme}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">{appeal.total_decisions} decisão(ões)</Badge>
            {profile && <NewDecisionDialog appealId={id} churchId={profile.church_id} userId={profile.id} />}
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              Decisões Registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>1ª vez</TableHead>
                  <TableHead>Conselheiro</TableHead>
                  <TableHead>Observações</TableHead>
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
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
