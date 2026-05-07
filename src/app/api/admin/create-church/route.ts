import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { church_name, city, state, pastor_name, email, phone, admin_name, admin_email, admin_password } = await req.json()
  if (!church_name) return NextResponse.json({ error: 'Nome da igreja obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Create church
  const { data: church, error: churchError } = await admin
    .from('churches')
    .insert({ name: church_name, city: city || null, state: state || null, pastor_name: pastor_name || null, email: email || null, phone: phone || null })
    .select()
    .single()

  if (churchError || !church) {
    return NextResponse.json({ error: churchError?.message || 'Erro ao criar igreja' }, { status: 400 })
  }

  // Create initial admin user if provided
  if (admin_email && admin_password && admin_name) {
    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_name },
    })

    if (userError || !newUser.user) {
      // Church created, user failed — still return success but warn
      return NextResponse.json({ success: true, church_id: church.id, user_warning: userError?.message })
    }

    await admin.from('profiles').upsert({
      id: newUser.user.id,
      church_id: church.id,
      full_name: admin_name,
      role: 'pastor',
      is_active: true,
    })
  }

  return NextResponse.json({ success: true, church_id: church.id })
}
