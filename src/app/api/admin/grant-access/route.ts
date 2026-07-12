import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FULL_ACCESS, MODULES } from '@/lib/roles'

// Which department leader can link people to which module
const MODULE_MANAGERS: Record<string, string[]> = {
  'conselheiros': ['counselor_leader'],
  'novos-membros': ['new_members_leader'],
  'discipulados': ['discipleship_supervisor'],
}

/**
 * Grants (or revokes) access to a module for an EXISTING user without
 * changing their primary role. This is how someone who already works in
 * one department gets linked to another (e.g., counselor who becomes
 * a GCA leader).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()
  if (!caller?.church_id) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  const { userId, module, action } = await req.json()

  const validModules = MODULES.map(m => m.key)
  if (!userId || !module || !validModules.includes(module)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  // Full access grants anything; dept leaders only their own module
  const isFullAccess = FULL_ACCESS.includes(caller.role)
  const isDeptManager = (MODULE_MANAGERS[module] || []).includes(caller.role)
  if (!isFullAccess && !isDeptManager) {
    return NextResponse.json({ error: 'Você não pode conceder acesso a este módulo.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('profiles')
    .select('church_id, role, custom_access')
    .eq('id', userId)
    .single()

  if (!target || target.church_id !== caller.church_id) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Este usuário não pode ser alterado.' }, { status: 403 })
  }

  const current: string[] = target.custom_access || []
  const next = action === 'remove'
    ? current.filter(k => k !== module)
    : Array.from(new Set([...current, module]))

  const { error: updateError } = await admin
    .from('profiles')
    .update({ custom_access: next.length > 0 ? next : null })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar acesso.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, custom_access: next })
}
