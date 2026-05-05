import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Phone, Search } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatPhone } from '@/lib/utils'
import { PERSON_STATUS_LABELS, type PersonStatus } from '@/lib/types'

const statusVariant: Record<PersonStatus, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline'> = {
  novo: 'secondary',
  em_novos_membros: 'info',
  concluiu_novos_membros: 'info',
  em_discipulado: 'default',
  em_acompanhamento: 'warning',
  servindo: 'success',
  inativo: 'outline',
}

export default async function PessoasPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('church_id, full_name, role').eq('id', user.id).single()
  if (!profile?.church_id) return null

  let query = supabase
    .from('people')
    .select('*')
    .eq('church_id', profile.church_id)
    .order('full_name')

  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.q) {
    query = query.ilike('full_name', `%${params.q}%`)
  }

  const { data: people } = await query.limit(100)

  const statusFilters = [
    { label: 'Todos', value: '' },
    { label: 'Novos', value: 'novo' },
    { label: 'Novos Membros', value: 'em_novos_membros' },
    { label: 'Discipulado', value: 'em_discipulado' },
    { label: 'Acompanhamento', value: 'em_acompanhamento' },
    { label: 'Servindo', value: 'servindo' },
    { label: 'Inativos', value: 'inativo' },
  ]

  return (
    <div>
      <Header title="Pessoas" description="Gerencie a jornada espiritual de cada pessoa" userName={profile.full_name} userRole={profile.role} />

      <div className="p-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {statusFilters.map((f) => (
              <Link key={f.value} href={f.value ? `/pessoas?status=${f.value}` : '/pessoas'}>
                <Badge
                  variant={params.status === f.value || (!params.status && !f.value) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {f.label}
                </Badge>
              </Link>
            ))}
          </div>
          <Link href="/pessoas/nova">
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Nova Pessoa
            </Button>
          </Link>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aceite Jesus</TableHead>
                  <TableHead>Pode Servir</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {people && people.length > 0 ? (
                  people.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <Link href={`/pessoas/${person.id}`} className="font-medium text-slate-900 hover:text-violet-600 transition-colors">
                          {person.full_name}
                        </Link>
                        {person.email && <p className="text-xs text-slate-400">{person.email}</p>}
                      </TableCell>
                      <TableCell>
                        {person.phone ? (
                          <a
                            href={`https://wa.me/55${person.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-slate-600 hover:text-green-600 transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                            <span className="text-sm">{formatPhone(person.phone)}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[person.status as PersonStatus] || 'secondary'}>
                          {PERSON_STATUS_LABELS[person.status as PersonStatus] || person.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(person.accepted_jesus_at)}
                      </TableCell>
                      <TableCell>
                        {person.can_serve ? (
                          <Badge variant="success">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/pessoas/${person.id}`}>
                          <Button variant="ghost" size="sm">Ver perfil</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma pessoa encontrada</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-sm text-slate-400">{people?.length || 0} pessoas encontradas</p>
      </div>
    </div>
  )
}
