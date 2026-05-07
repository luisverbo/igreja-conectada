import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.church_id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  if (!['super_admin', 'pastor', 'coordinator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { full_name, email, password, role } = await req.json()
  if (!full_name || !email || !password || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message || 'Erro ao criar usuário' }, { status: 400 })
  }

  await supabaseAdmin.from('profiles').upsert({
    id: newUser.user.id,
    church_id: profile.church_id,
    full_name,
    role,
    is_active: true,
  })

  return NextResponse.json({ success: true })
}
