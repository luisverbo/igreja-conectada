import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * One-time bootstrap: creates the first super_admin.
 * Works ONLY while no super_admin exists (the RLS hardening blocked
 * the old client-side role self-update, so this runs with service role).
 */
export async function POST(req: NextRequest) {
  const admin = createAdminClient()

  // Hard gate: refuses once any super_admin exists
  const { count } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin')

  if ((count || 0) > 0) {
    return NextResponse.json({ error: 'O sistema já foi configurado.' }, { status: 403 })
  }

  const { full_name, email, password } = await req.json()
  if (!full_name?.trim() || !email?.trim() || !password || password.length < 6) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  // Use the first church, or create one placeholder to be edited later
  let { data: church } = await admin.from('churches').select('id').limit(1).maybeSingle()
  if (!church) {
    const { data: newChurch, error: churchError } = await admin
      .from('churches')
      .insert({ name: 'Minha Igreja' })
      .select('id')
      .single()
    if (churchError || !newChurch) {
      return NextResponse.json({ error: 'Erro ao preparar a igreja.' }, { status: 500 })
    }
    church = newChurch
  }

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: 'Erro ao criar a conta.' }, { status: 400 })
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: newUser.user.id,
    church_id: church.id,
    full_name: full_name.trim(),
    role: 'super_admin',
    is_active: true,
  })

  if (profileError) {
    return NextResponse.json({ error: 'Erro ao configurar o perfil.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
