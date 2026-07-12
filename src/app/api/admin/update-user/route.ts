import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignableRoles } from '@/lib/roles'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { data: caller } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  const callerAllowed = caller ? assignableRoles(caller.role) : []
  if (!caller?.church_id || callerAllowed.length === 0) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, role, is_active, full_name, phone } = body

  if (!userId) {
    return NextResponse.json({ error: 'Usuário não informado.' }, { status: 400 })
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'Você não pode editar sua própria conta por aqui.' }, { status: 400 })
  }
  if (role !== undefined && !callerAllowed.includes(role)) {
    return NextResponse.json({ error: 'Você não pode atribuir essa função.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Target must belong to the same church and cannot be a super_admin
  const { data: target } = await admin
    .from('profiles')
    .select('church_id, role')
    .eq('id', userId)
    .single()

  if (!target || target.church_id !== caller.church_id) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Este usuário não pode ser alterado.' }, { status: 403 })
  }
  // Department leaders can only manage users within their own department
  if (!callerAllowed.includes(target.role)) {
    return NextResponse.json({ error: 'Você não pode editar este usuário.' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (role !== undefined) updates.role = role
  if (is_active !== undefined) updates.is_active = !!is_active
  if (full_name !== undefined) updates.full_name = String(full_name).trim()
  if (phone !== undefined) updates.phone = String(phone).trim() || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 })
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
