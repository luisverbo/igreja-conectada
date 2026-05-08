import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { classId, churchId, token, full_name, phone, email, birth_date } = body

  if (!classId || !churchId || !token || !full_name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify the token matches the class
  const { data: turma } = await supabase
    .from('new_members_classes')
    .select('id, status')
    .eq('id', classId)
    .eq('registration_token', token)
    .single()

  if (!turma || turma.status !== 'ativa') {
    return NextResponse.json({ error: 'Turma não encontrada ou encerrada.' }, { status: 404 })
  }

  // Find existing person by phone, email, or exact name (in order of confidence)
  let existingId: string | null = null

  // 1. Match by phone (most reliable)
  const { data: byPhone } = await supabase
    .from('people')
    .select('id')
    .eq('church_id', churchId)
    .eq('phone', phone.trim())
    .maybeSingle()

  if (byPhone) {
    existingId = byPhone.id
  }

  // 2. Match by email if not found by phone
  if (!existingId && email?.trim()) {
    const { data: byEmail } = await supabase
      .from('people')
      .select('id')
      .eq('church_id', churchId)
      .eq('email', email.trim())
      .maybeSingle()
    if (byEmail) existingId = byEmail.id
  }

  // 3. Match by exact full name if still not found
  if (!existingId) {
    const { data: byName } = await supabase
      .from('people')
      .select('id')
      .eq('church_id', churchId)
      .ilike('full_name', full_name.trim())
      .maybeSingle()
    if (byName) existingId = byName.id
  }

  let personId: string

  if (existingId) {
    personId = existingId
    // Update missing fields if the match was by name/email and phone was blank
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

  // Enroll (upsert to handle duplicates)
  const { error: enrollError } = await supabase
    .from('new_members_enrollments')
    .upsert(
      { class_id: classId, person_id: personId },
      { onConflict: 'class_id,person_id' }
    )

  if (enrollError) {
    return NextResponse.json({ error: 'Erro ao realizar matrícula.' }, { status: 500 })
  }

  // Update person status
  await supabase.from('people').update({ status: 'em_novos_membros' }).eq('id', personId)

  // Journey event
  await supabase.from('journey_events').insert({
    person_id: personId,
    event_type: 'entrou_novos_membros',
    recorded_by: null,
  })

  return NextResponse.json({ ok: true })
}
