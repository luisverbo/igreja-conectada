import { getSessionProfile } from '@/lib/get-profile'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Phone, Search } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatPhone } from '@/lib/utils'
import { PERSON_STATUS_LABELS, type PersonStatus, type UserRole } from '@/lib/types'

import { ROLE_LABELS as roleLabels } from '@/lib/roles'

const statusVariant: Record<PersonStatus, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline'> = {
  novo: 'secondary',
  em_novos_membros: 'info',
  concluiu_novos_membros: 'info',
  em_discipulado: 'default',
  em_acompanhamento: 'warning',
  servindo: 'success',
  inativo: 'outline',
}

const PAGE_SIZE = 50

export default async function PessoasPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const params = await searchParams
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return null
  if (!profile?.church_id) return null

  const page = Math.max(1, parseInt(params.page || '1') || 1)

  let query = supabase
    .from('people')
    .select('*, counselor:profiles!people_created_by_fkey(full_name, role)', { count: 'exact' })
    .eq('church_id', profile.church_id)
    .order('full_name')

  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.q) {
    query = query.ilike('full_name', `%${params.q}%`)
  }

  const { data: people, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
  const buildUrl = (p: number) => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.q) qs.set('q', params.q)
    if (p > 1) qs.set('page', String(p))
    const s = qs.toString()
    return s ? `/pessoas?${s}` : '/pessoas'
  }

  const statusFilters = [
    { label: 'Todos', value: '' },
    { label: 'Novos', value: 'novo' },
    { label: 'Em NM', value: 'em_novos_membros' },
    { label: 'Concluiu NM', value: 'concluiu_novos_membros' },
    { label: 'Discipulado', value: 'em_discipulado' },
    { label: 'Acompanhamento', value: 'em_acompanhamento' },
    { label: 'Servindo', value: 'servindo' },
    { label: 'Inativos', value: 'inativo' },
  ]

  return (
    <div>
      <Header title="Pessoas" description="Gerencie a jornada espiritual de cada pessoa" userName={profile.full_name} userRole={profile.role} />

      <div className="p-6 space-y-4">
        {/* Search + actions */}
        <div className="flex items-center gap-3">
          <form method="GET" action="/pessoas" className="flex-1 max-w-sm">
            {params.status && <input type="hidden" name="status" value={params.status} />}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="q"
                defaultValue={params.q || ''}
                placeholder="Buscar por nome..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </form>
          <Link href="/pessoas/nova">
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Nova Pessoa
            </Button>
          </Link>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((f) => (
            <Link key={f.value} href={f.value ? `/pessoas?status=${f.value}${params.q ? `&q=${params.q}` : ''}` : `/pessoas${params.q ? `?q=${params.q}` : ''}`}>
              <Badge
                variant={params.status === f.value || (!params.status && !f.value) ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
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
                  <TableHead>Cadastrado por</TableHead>
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
                      <TableCell className="text-sm text-slate-600">
                        {(person as any).counselor ? (
                          <div>
                            <p className="font-medium text-slate-900">{(person as any).counselor.full_name}</p>
                            <p className="text-xs text-slate-400">{roleLabels[(person as any).counselor.role] ?? (person as any).counselor.role}</p>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
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
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma pessoa encontrada</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {count || 0} pessoa(s) · página {page} de {totalPages}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link href={buildUrl(page - 1)}>
                  <Button variant="outline" size="sm">← Anterior</Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildUrl(page + 1)}>
                  <Button variant="outline" size="sm">Próxima →</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
