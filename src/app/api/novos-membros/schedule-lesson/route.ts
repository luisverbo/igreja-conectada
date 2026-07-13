import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NM_MANAGERS } from '@/lib/roles'

/**
 * Agenda (ou reagenda/cancela) o lembrete de WhatsApp do professor de
 * uma aula — enviado 1 dia antes da data da aula. Chamado sempre que a
 * data ou o professor da aula muda.
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
  if (!profile?.church_id || !NM_MANAGERS.includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { lessonId } = await req.json()
  if (!lessonId) return NextResponse.json({ error: 'Aula não informada.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: lesson } = await admin
    .from('new_members_lessons')
    .select('id, title, title2, lesson_date, status, teacher_id, class_id, new_members_classes!inner(church_id, name, time_start)')
    .eq('id', lessonId)
    .single()

  const turma = lesson?.new_members_classes as any
  if (!lesson || turma?.church_id !== profile.church_id) {
    return NextResponse.json({ error: 'Aula não encontrada.' }, { status: 404 })
  }

  // Sempre limpa o lembrete anterior desta aula (ainda pendente)
  await admin.from('scheduled_messages').delete().eq('lesson_id', lessonId).eq('status', 'pendente')

  // Só agenda quando há data futura, professor definido e a aula não foi cancelada
  if (!lesson.lesson_date || !lesson.teacher_id || lesson.status === 'cancelada') {
    return NextResponse.json({ ok: true, scheduled: false })
  }

  const { data: teacher } = await admin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', lesson.teacher_id)
    .single()

  if (!teacher?.phone) {
    return NextResponse.json({ ok: true, scheduled: false, reason: 'professor sem telefone' })
  }

  // Envia às 18:00 (horário de Brasília ≈ 21:00 UTC) do dia anterior
  const lessonDay = new Date(`${lesson.lesson_date}T00:00:00-03:00`)
  const sendAt = new Date(lessonDay.getTime() - 24 * 3600 * 1000)
  sendAt.setUTCHours(21, 0, 0, 0)

  // Se a data-1 já passou, não agenda
  if (sendAt.getTime() <= Date.now()) {
    return NextResponse.json({ ok: true, scheduled: false, reason: 'data muito próxima' })
  }

  const hora = turma.time_start ? ` às ${String(turma.time_start).slice(0, 5)}` : ''
  const materias = [lesson.title, lesson.title2].filter(Boolean).join(' e ')
  const firstName = (teacher.full_name || '').split(' ')[0]
  const message = `Olá, ${firstName}! 📚\n\nPassando para lembrar que *amanhã* você dá aula no Novos Membros (turma ${turma.name})${hora}.\n\n📖 Matéria: ${materias}\n\nDeus abençoe seu ministério! 💜`

  await admin.from('scheduled_messages').insert({
    church_id: profile.church_id,
    person_id: null,
    lesson_id: lessonId,
    phone: teacher.phone,
    send_at: sendAt.toISOString(),
    status: 'pendente',
    custom_message: message,
  })

  return NextResponse.json({ ok: true, scheduled: true })
}
