import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignableRoles } from '@/lib/roles'

/**
 * Exclui um usuário do sistema (profile + conta de acesso).
 * O histórico que ele registrou é preservado — os campos "registrado
 * por" ficam vazios em vez de bloquear a exclusão.
 *
 * GET  ?userId=  → verifica impacto antes de excluir (quantos GCAs lidera)
 * POST { userId } → exclui de fato
 */

async function loadContext(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.', status: 401 as const }

  const { data: caller } = await supabase
    .from('profiles').select('church_id, role').eq('id', user.id).single()

  const allowed = caller ? assignableRoles(caller.role) : []
  if (!caller?.church_id || allowed.length === 0) {
    return { error: 'Sem permissão.', status: 403 as const }
  }
  if (!userId) return { error: 'Usuário não informado.', status: 400 as const }
  if (userId === user.id) {
    return { error: 'Você não pode excluir a sua própria conta.', status: 400 as const }
  }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('profiles').select('id, full_name, church_id, role').eq('id', userId).single()

  if (!target || target.church_id !== caller.church_id) {
    return { error: 'Usuário não encontrado.', status: 404 as const }
  }
  if (target.role === 'super_admin') {
    return { error: 'Este usuário não pode ser excluído.', status: 403 as const }
  }
  if (!allowed.includes(target.role)) {
    return { error: 'Você não pode excluir este usuário.', status: 403 as const }
  }

  return { admin, target }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || ''
  const ctx = await loadContext(userId)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { admin, target } = ctx

  // GCAs que a pessoa lidera/supervisiona ficarão sem responsável
  const { data: gcas } = await admin
    .from('discipleships')
    .select('name, leader_id, leader2_id, supervisor_id')
    .or(`leader_id.eq.${userId},leader2_id.eq.${userId},supervisor_id.eq.${userId}`)

  const asLeader = (gcas || []).filter(g => g.leader_id === userId || g.leader2_id === userId).map(g => g.name)
  const asSupervisor = (gcas || []).filter(g => g.supervisor_id === userId).map(g => g.name)

  return NextResponse.json({
    ok: true,
    name: target.full_name,
    role: target.role,
    asLeader,
    asSupervisor,
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json()
  const ctx = await loadContext(userId)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { admin, target } = ctx

  // Remove a conta de acesso — o profile cai junto (ON DELETE CASCADE)
  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) {
    // Usuário sem conta de auth (caso raro): remove só o profile
    const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
    if (profileError) {
      return NextResponse.json({ error: 'Erro ao excluir o usuário.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, name: target.full_name })
}
