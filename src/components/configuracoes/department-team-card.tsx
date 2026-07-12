import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { CreateUserDialog } from '@/components/configuracoes/create-user-dialog'
import { EditUserDialog } from '@/components/configuracoes/edit-user-dialog'
import { LinkExistingUser } from '@/components/configuracoes/link-existing-user'
import { ROLE_LABELS } from '@/lib/roles'

interface Props {
  churchId: string
  currentUserId: string
  title: string
  description: string
  deptRoles: string[]      // roles listed in this card
  assignRoles: string[]    // roles the leader can assign
  canEdit: boolean
  moduleKey?: string       // module key for linking existing users
  moduleLabel?: string
}

export async function DepartmentTeamCard({ churchId, currentUserId, title, description, deptRoles, assignRoles, canEdit, moduleKey, moduleLabel }: Props) {
  const supabase = await createClient()

  // Native department roles + people linked via custom access
  let query = supabase
    .from('profiles')
    .select('id, full_name, phone, role, is_active, custom_access')
    .eq('church_id', churchId)
    .order('full_name')

  if (moduleKey) {
    query = query.or(`role.in.(${deptRoles.join(',')}),custom_access.cs.{${moduleKey}}`)
  } else {
    query = query.in('role', deptRoles)
  }

  const { data: team } = await query

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {(team?.length || 0) > 0 && (
            <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-bold">{team!.length}</span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {moduleKey && (
              <LinkExistingUser
                churchId={churchId}
                module={moduleKey}
                moduleLabel={moduleLabel || title}
                excludeRoles={deptRoles}
              />
            )}
            <CreateUserDialog allowedRoles={assignRoles} buttonLabel="Adicionar" />
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">{description}</p>

      {team && team.length > 0 ? (
        <div className="space-y-1.5">
          {team.map(u => {
            const isLinked = moduleKey && !deptRoles.includes(u.role)
            return (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                  {u.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[u.role] || u.role}
                    {isLinked && <span className="text-violet-500 font-medium"> · vinculado de outro departamento</span>}
                  </p>
                </div>
                <Badge variant={u.is_active ? 'success' : 'outline'}>
                  {u.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
                {canEdit && u.id !== currentUserId && !isLinked && (
                  <EditUserDialog user={u} allowedRoles={assignRoles} />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 py-4 text-center">Nenhum membro na equipe ainda</p>
      )}
    </div>
  )
}
