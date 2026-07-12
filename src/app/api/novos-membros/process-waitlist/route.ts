import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAndLogWhatsApp } from '@/lib/whatsapp'
import { msgBoasVindasNovosMembros, DAY_LABELS } from '@/lib/whatsapp-templates'

/**
 * Enrolls everyone on the church's waiting list into the given class.
 * Called right after a new class is created with open enrollment.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.church_id || !['super_admin', 'pastor', 'coordinator', 'new_members_teacher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { classId } = await req.json()
  if (!classId) return NextResponse.json({ error: 'Turma não informada.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: turma } = await admin
    .from('new_members_classes')
    .select('id, church_id, name, day_of_week, time_start, status, enrollment_open')
    .eq('id', classId)
    .single()

  if (!turma || turma.church_id !== profile.church_id || turma.status !== 'ativa' || !turma.enrollment_open) {
    return NextResponse.json({ error: 'Turma não disponível para matrícula.' }, { status: 400 })
  }

  const { data: waiting } = await admin
    .from('enrollment_waitlist')
    .select('id, person_id, people(full_name, phone)')
    .eq('church_id', profile.church_id)
    .eq('status', 'aguardando')
    .order('created_at')

  if (!waiting || waiting.length === 0) {
    return NextResponse.json({ ok: true, enrolled: 0 })
  }

  let enrolled = 0
  for (const w of waiting) {
    const { error: enrollError } = await admin
      .from('new_members_enrollments')
      .upsert(
        { class_id: classId, person_id: w.person_id },
        { onConflict: 'class_id,person_id' }
      )
    if (enrollError) continue

    await admin.from('people').update({ status: 'em_novos_membros' }).eq('id', w.person_id)
    await admin.from('journey_events').insert({
      person_id: w.person_id,
      event_type: 'entrou_novos_membros',
      description: 'Matriculado automaticamente da fila de espera',
      recorded_by: null,
    })
    await admin.from('enrollment_waitlist')
      .update({ status: 'matriculado', enrolled_class_id: classId })
      .eq('id', w.id)

    const person = w.people as any
    if (person?.phone) {
      sendAndLogWhatsApp({
        churchId: profile.church_id,
        phone: person.phone,
        message: msgBoasVindasNovosMembros(
          person.full_name,
          turma.name,
          turma.day_of_week ? DAY_LABELS[turma.day_of_week] || turma.day_of_week : undefined,
          turma.time_start?.slice(0, 5),
        ),
        personId: w.person_id,
        messageType: 'boas_vindas_novos_membros',
      }).catch(() => {})
    }
    enrolled++
  }

  return NextResponse.json({ ok: true, enrolled })
}
