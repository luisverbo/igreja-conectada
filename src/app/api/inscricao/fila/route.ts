import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public endpoint: joins the church's Novos Membros waiting list.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { churchToken, full_name, phone, email, birth_date } = body

  if (!churchToken || !full_name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: church } = await supabase
    .from('churches')
    .select('id')
    .eq('registration_token', churchToken)
    .single()

  if (!church) {
    return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 })
  }
  const churchId = church.id

  // Same person matching as /api/inscricao: phone → email → exact name
  let personId: string | null = null

  const { data: byPhone } = await supabase
    .from('people')
    .select('id')
    .eq('church_id', churchId)
    .eq('phone', phone.trim())
    .maybeSingle()
  if (byPhone) personId = byPhone.id

  if (!personId && email?.trim()) {
    const { data: byEmail } = await supabase
      .from('people')
      .select('id')
      .eq('church_id', churchId)
      .eq('email', email.trim())
      .maybeSingle()
    if (byEmail) personId = byEmail.id
  }

  if (!personId) {
    const { data: byName } = await supabase
      .from('people')
      .select('id')
      .eq('church_id', churchId)
      .ilike('full_name', full_name.trim())
      .maybeSingle()
    if (byName) personId = byName.id
  }

  if (personId) {
    await supabase
      .from('people')
      .update({
        phone: phone.trim(),
        ...(email?.trim() ? { email: email.trim() } : {}),
        ...(birth_date ? { birth_date } : {}),
      })
      .eq('id', personId)
      .eq('church_id', churchId)
  } else {
    const { data: newPerson, error: personError } = await supabase
      .from('people')
      .insert({
        church_id: churchId,
        full_name: full_name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        birth_date: birth_date || null,
        status: 'novo',
      })
      .select('id')
      .single()

    if (personError || !newPerson) {
      return NextResponse.json({ error: 'Erro ao cadastrar pessoa.' }, { status: 500 })
    }
    personId = newPerson.id
  }

  // Already enrolled in an active class? No need for the waitlist.
  const { data: activeEnrollment } = await supabase
    .from('new_members_enrollments')
    .select('id, new_members_classes!inner(status)')
    .eq('person_id', personId)
    .eq('new_members_classes.status', 'ativa')
    .limit(1)
    .maybeSingle()

  if (activeEnrollment) {
    return NextResponse.json({ ok: true, already: 'matriculado' })
  }

  // Add to waitlist (unique index prevents duplicates while waiting)
  const { error: waitError } = await supabase
    .from('enrollment_waitlist')
    .insert({ church_id: churchId, person_id: personId, status: 'aguardando' })

  if (waitError && !waitError.message.includes('duplicate')) {
    return NextResponse.json({ error: 'Erro ao entrar na fila.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
