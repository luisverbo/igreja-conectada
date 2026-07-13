import { getSessionProfile } from '@/lib/get-profile'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Settings, Users, Church, MessageSquare, Clock, UserCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CreateUserDialog } from '@/components/configuracoes/create-user-dialog'
import { EditUserDialog } from '@/components/configuracoes/edit-user-dialog'
import { EditChurchDialog } from '@/components/configuracoes/edit-church-dialog'
import { WhatsAppSection } from '@/components/configuracoes/whatsapp-section'
import { FollowupRulesSection } from '@/components/configuracoes/followup-rules-section'
import { CareRulesSection } from '@/components/configuracoes/care-rules-section'
import { ROLE_LABELS } from '@/lib/roles'

const roleLabels = ROLE_LABELS

const roleVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'info'> = {
  super_admin: 'default',
  pastor: 'success',
  coordinator: 'info',
  supervisor: 'info',
  counselor: 'secondary',
  counselor_leader: 'warning',
  new_members_teacher: 'secondary',
  new_members_leader: 'warning',
  new_members_helper: 'secondary',
  discipleship_supervisor: 'warning',
  discipleship_leader: 'secondary',
  viewer: 'outline' as any,
}

export default async function ConfiguracoesPage() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user) return null
  if (!profile?.church_id) return null

  const [{ data: church }, { data: users }] = await Promise.all([
    supabase.from('churches').select('*').eq('id', profile.church_id).single(),
    supabase.from('profiles').select('*').eq('church_id', profile.church_id).order('full_name'),
  ])

  const canManageUsers = ['super_admin', 'pastor', 'coordinator', 'supervisor'].includes(profile.role)

  return (
    <div>
      <Header title="Configurações" description="Igreja e usuários do sistema" userName={profile.full_name} userRole={profile.role} />

      <div className="p-6 space-y-6">
        {/* Church info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Church className="h-4 w-4 text-violet-600" />
                Informações da Igreja
              </CardTitle>
              {church && canManageUsers && <EditChurchDialog church={church} />}
            </div>
          </CardHeader>
          <CardContent>
            {church ? (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: 'Nome', value: church.name },
                  { label: 'Pastor', value: church.pastor_name },
                  { label: 'E-mail', value: church.email },
                  { label: 'Telefone', value: church.phone },
                  { label: 'CNPJ', value: church.cnpj },
                  { label: 'Cidade', value: [church.city, church.state].filter(Boolean).join(', ') },
                  { label: 'WhatsApp Instance', value: church.whatsapp_instance },
                  { label: 'Cadastrado em', value: formatDate(church.created_at) },
                ].map(item => item.value ? (
                  <div key={item.label}>
                    <dt className="text-slate-500 font-medium">{item.label}</dt>
                    <dd className="text-slate-900 mt-0.5">{item.value}</dd>
                  </div>
                ) : null)}
              </dl>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  Configure as informações da igreja no painel do Supabase ou contate o suporte.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        {canManageUsers && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-600" />
                  Usuários do Sistema
                </CardTitle>
                <CreateUserDialog allowCustomAccess />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-slate-900">
                        {u.full_name}
                        {u.id === profile.id && <Badge variant="secondary" className="ml-2 text-xs">Você</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{u.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={roleVariant[u.role] || 'secondary'}>
                          {roleLabels[u.role] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'success' : 'outline'}>
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(u.created_at)}</TableCell>
                      <TableCell>
                        {u.id !== profile.id && u.role !== 'super_admin' && (
                          <EditUserDialog user={u} allowCustomAccess />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp */}
        {canManageUsers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WhatsAppSection />
            </CardContent>
          </Card>
        )}

        {/* Mensagens automáticas pós-conversão */}
        {canManageUsers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-600" />
                Mensagens Automáticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FollowupRulesSection churchId={profile.church_id} />
            </CardContent>
          </Card>
        )}

        {/* Encaminhamento de novos convertidos */}
        {canManageUsers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                Encaminhamento de Novos Convertidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CareRulesSection churchId={profile.church_id} />
            </CardContent>
          </Card>
        )}

        {/* System info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              Sobre o Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Sistema</dt><dd className="font-medium">Igreja Conectada v1.0</dd></div>
              <div><dt className="text-slate-500">Banco de Dados</dt><dd className="font-medium">Supabase (PostgreSQL)</dd></div>
              <div><dt className="text-slate-500">WhatsApp</dt><dd className="font-medium">Evolution API</dd></div>
              <div><dt className="text-slate-500">Autenticação</dt><dd className="font-medium">Supabase Auth</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
