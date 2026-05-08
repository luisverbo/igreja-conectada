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

  // Find existing person by phone in this church, or create new
  const { data: existing } = await supabase
    .from('people')
    .select('id, status')
    .eq('church_id', churchId)
    .eq('phone', phone.trim())
    .maybeSingle()

  let personId: string

  if (existing) {
    personId = existing.id
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
