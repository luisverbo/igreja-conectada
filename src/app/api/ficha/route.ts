import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Public submission of the student form (ficha) for a Novos Membros class.
 * The token identifies the class. The student fills it themselves; a
 * logged-in volunteer may fill on behalf of someone (filledBy passed).
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, filledBy, form } = body

  if (!token || !form?.full_name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }
  if (!form.estatuto_accepted) {
    return NextResponse.json({ error: 'É necessário aceitar o estatuto.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: turma } = await supabase
    .from('new_members_classes')
    .select('id, church_id, status')
    .eq('registration_token', token)
    .single()

  if (!turma || turma.status !== 'ativa') {
    return NextResponse.json({ error: 'Turma não encontrada ou encerrada.' }, { status: 404 })
  }

  const churchId = turma.church_id

  // Match/find the person (phone → cpf → email → name) to link the ficha
  let personId: string | null = null
  const phone = (form.phone1 || '').trim()
  const cpf = (form.cpf || '').replace(/\D/g, '')

  if (phone) {
    const { data } = await supabase.from('people').select('id').eq('church_id', churchId).eq('phone', phone).maybeSingle()
    if (data) personId = data.id
  }
  if (!personId && cpf) {
    const { data } = await supabase.from('people').select('id').eq('church_id', churchId).eq('cpf', cpf).maybeSingle()
    if (data) personId = data.id
  }
  if (!personId && form.email?.trim()) {
    const { data } = await supabase.from('people').select('id').eq('church_id', churchId).eq('email', form.email.trim()).maybeSingle()
    if (data) personId = data.id
  }
  if (!personId) {
    const { data } = await supabase.from('people').select('id').eq('church_id', churchId).ilike('full_name', form.full_name.trim()).maybeSingle()
    if (data) personId = data.id
  }

  // Create the person if brand new, so they appear in the system
  if (!personId) {
    const { data: newPerson } = await supabase
      .from('people')
      .insert({
        church_id: churchId,
        full_name: form.full_name.trim(),
        phone: phone || null,
        cpf: cpf || null,
        email: form.email?.trim() || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        neighborhood: form.neighborhood || null,
        city: form.city || null,
        state: form.state || null,
        address: form.address || null,
        marital_status: form.marital_status || null,
        profession: form.profession || null,
        status: 'em_novos_membros',
      })
      .select('id')
      .single()
    personId = newPerson?.id ?? null
  } else {
    // Keep the person record fresh with contact info
    await supabase.from('people').update({
      ...(phone ? { phone } : {}),
      ...(cpf ? { cpf } : {}),
      ...(form.email?.trim() ? { email: form.email.trim() } : {}),
      ...(form.birth_date ? { birth_date: form.birth_date } : {}),
    }).eq('id', personId).eq('church_id', churchId)
  }

  // Ensure enrollment in this class
  let enrollmentId: string | null = null
  if (personId) {
    const { data: existing } = await supabase
      .from('new_members_enrollments')
      .select('id')
      .eq('class_id', turma.id)
      .eq('person_id', personId)
      .maybeSingle()
    if (existing) {
      enrollmentId = existing.id
    } else {
      const { data: enr } = await supabase
        .from('new_members_enrollments')
        .insert({ class_id: turma.id, person_id: personId })
        .select('id')
        .single()
      enrollmentId = enr?.id ?? null
      if (personId) {
        await supabase.from('people').update({ status: 'em_novos_membros' }).eq('id', personId)
      }
    }
  }

  // One ficha per person per class — update if it already exists
  const record = {
    church_id: churchId,
    class_id: turma.id,
    person_id: personId,
    enrollment_id: enrollmentId,
    full_name: form.full_name.trim(),
    photo_url: form.photo_url || null,
    gender: form.gender || null,
    education_level: form.education_level || null,
    formation: form.formation || null,
    is_entrepreneur: !!form.is_entrepreneur,
    profession: form.profession || null,
    address_type: form.address_type || 'nacional',
    has_cpf: form.has_cpf !== false,
    cpf: cpf || null,
    rg: form.rg || null,
    rg_ssp: form.rg_ssp || null,
    naturalidade: form.naturalidade || null,
    nacionalidade: form.nacionalidade || null,
    birth_date: form.birth_date || null,
    marital_status: form.marital_status || null,
    cep: form.cep || null,
    address: form.address || null,
    city: form.city || null,
    neighborhood: form.neighborhood || null,
    sub_neighborhood: form.sub_neighborhood || null,
    state: form.state || null,
    country: form.country || null,
    number: form.number || null,
    complement: form.complement || null,
    phone1: phone || null,
    phone1_op: form.phone1_op || null,
    phone1_whatsapp: !!form.phone1_whatsapp,
    phone2: form.phone2 || null,
    phone2_op: form.phone2_op || null,
    phone2_whatsapp: !!form.phone2_whatsapp,
    email: form.email?.trim() || null,
    dependents: Array.isArray(form.dependents) ? form.dependents.filter((d: any) => d.name?.trim()) : [],
    rhema: form.rhema || 'ainda_nao_fez',
    emr: form.emr || 'ainda_nao_fez',
    ermm: form.ermm || 'ainda_nao_fez',
    novo_nascimento: form.novo_nascimento || null,
    batismo_espirito_santo: form.batismo_espirito_santo || 'nao',
    batismo_aguas: form.batismo_aguas || null,
    batismo_aguas_como: form.batismo_aguas_como || null,
    facebook: form.facebook || null,
    instagram: form.instagram || null,
    observacoes: form.observacoes || null,
    estatuto_accepted: true,
    filled_by: filledBy || null,
  }

  const { data: existingForm } = await supabase
    .from('student_forms')
    .select('id')
    .eq('class_id', turma.id)
    .eq('person_id', personId)
    .maybeSingle()

  if (existingForm) {
    await supabase.from('student_forms').update(record).eq('id', existingForm.id)
  } else {
    await supabase.from('student_forms').insert(record)
  }

  return NextResponse.json({ ok: true })
}
