// ============================================================
// Hierarquia de acesso
// ============================================================

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  pastor: 'Pastor',
  coordinator: 'Coordenador',
  supervisor: 'Supervisor',
  counselor: 'Conselheiro',
  counselor_leader: 'Líder de Conselheiros',
  new_members_teacher: 'Professor Novos Membros',
  new_members_leader: 'Líder de Novos Membros',
  new_members_helper: 'Auxiliar Novos Membros',
  discipleship_supervisor: 'Supervisor de Discipulado',
  discipleship_leader: 'Líder de Discipulado',
  viewer: 'Visualizador',
}

// Acesso total ao sistema
export const FULL_ACCESS = ['super_admin', 'pastor', 'coordinator', 'supervisor']

// Pode gerenciar o departamento Novos Membros (criar/editar/concluir turmas)
export const NM_MANAGERS = [...FULL_ACCESS, 'new_members_leader', 'new_members_teacher']

// Pode acessar o departamento Novos Membros (inclui quem só dá presença)
export const NM_ACCESS = [...NM_MANAGERS, 'new_members_helper']

// Pode gerenciar o departamento Conselheiros
export const COUNSELOR_MANAGERS = [...FULL_ACCESS, 'counselor_leader']

// Pode autorizar entrada no discipulado sem NM concluído
export const DISCIPLESHIP_AUTHORIZERS = [...FULL_ACCESS, 'discipleship_supervisor']

// Quais funções cada papel pode atribuir ao criar usuários
export function assignableRoles(callerRole: string): string[] {
  if (['super_admin', 'pastor', 'coordinator', 'supervisor'].includes(callerRole)) {
    return [
      'pastor', 'coordinator', 'supervisor',
      'counselor', 'counselor_leader',
      'new_members_leader', 'new_members_teacher', 'new_members_helper',
      'discipleship_supervisor', 'discipleship_leader', 'viewer',
    ]
  }
  if (callerRole === 'new_members_leader') {
    return ['new_members_teacher', 'new_members_helper']
  }
  if (callerRole === 'counselor_leader') {
    return ['counselor']
  }
  return []
}
