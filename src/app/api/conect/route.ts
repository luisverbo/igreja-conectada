import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAndLogWhatsApp } from '@/lib/whatsapp'
import { caregiverAlert } from '@/lib/journey'
import { msgBoasVindasNovosMembros, DAY_LABELS } from '@/lib/whatsapp-templates'
import { CONECT_ACCESS, CONECT_MANAGERS } from '@/lib/roles'

const RESULTS = ['conversou', 'nao_atendeu', 'mensagem', 'presencial']
const RESULT_LABEL: Record<string, string> = {
  conversou: 'Conversou por ligação', nao_atendeu: 'Não atendeu', mensagem: 'Falou por mensagem', presencial: 'Conversou pessoalmente',
}

/**
 * Ações da caixa do Conect:
 *  - assign:       escolher/trocar o responsável (só gestores do Conect)
 *  - contact:      registrar um contato feito com a pessoa
 *  - novosMembros: matricular numa turma aberta ou colocar na fila de espera
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('id, church_id, role, full_name, custom_access').eq('id', user.id).single()
  const hasAccess = !!me && (CONECT_ACCESS.includes(me.role) || (me.custom_access || []).includes('conect'))
  if (!me?.church_id || !hasAccess) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  const isManager = CONECT_MANAGERS.includes(me.role)

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()
  const { data: person } = await admin
    .from('people').select('id, church_id, full_name, phone, origin, status, assigned_to').eq('id', body.personId).maybeSingle()
  if (!person || person.church_id !== me.church_id) return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })
  // Quem não é gestor só mexe em quem está com ele
  if (!isManager && person.assigned_to !== me.id) return NextResponse.json({ error: 'Esta pessoa não está com você.' }, { status: 403 })

  // ── Responsável ──
  if (body.action === 'assign') {
    if (!isManager) return NextResponse.json({ error: 'Só a liderança do Conect distribui as pessoas.' }, { status: 403 })
    const to: string | null = body.assignedTo || null
    let caregiver: { id: string; full_name: string; phone: string | null } | null = null
    if (to) {
      const { data } = await admin.from('profiles').select('id, full_name, phone, church_id, is_active').eq('id', to).maybeSingle()
      if (!data || data.church_id !== me.church_id || data.is_active === false) return NextResponse.json({ error: 'Responsável inválido.' }, { status: 400 })
      caregiver = data
    }
    await admin.from('people').update({ assigned_to: to }).eq('id', person.id)
    await admin.from('journey_events').insert({
      person_id: person.id, event_type: 'observacao', recorded_by: me.id,
      description: caregiver ? `Encaminhado(a) para acompanhamento de ${caregiver.full_name} (por ${me.full_name})` : `Responsável removido (por ${me.full_name})`,
    })
    if (caregiver?.phone && caregiver.id !== person.assigned_to) {
      sendAndLogWhatsApp({
        churchId: me.church_id, phone: caregiver.phone, personId: person.id, messageType: 'alerta_pastoral',
        message: caregiverAlert(caregiver.full_name, person, person.origin),
      }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  }

  // ── Contato ──
  if (body.action === 'contact') {
    if (!RESULTS.includes(body.result)) return NextResponse.json({ error: 'Escolha como foi o contato.' }, { status: 400 })
    const note = String(body.note || '').trim().slice(0, 1000) || null
    const wantsNm = body.wantsNm === true ? true : body.wantsNm === false ? false : null
    const { error } = await admin.from('conect_contacts').insert({
      church_id: me.church_id, person_id: person.id, contacted_by: me.id, result: body.result, wants_nm: wantsNm, note,
    })
    if (error) return NextResponse.json({ error: 'Não foi possível registrar (o SQL do Conect já foi aplicado?).' }, { status: 500 })
    await admin.from('journey_events').insert({
      person_id: person.id, event_type: 'observacao', recorded_by: me.id,
      description: `📞 Conect (${me.full_name}): ${RESULT_LABEL[body.result]}${wantsNm === true ? ' · quer fazer Novos Membros' : wantsNm === false ? ' · não quer Novos Membros agora' : ''}${note ? ` — ${note}` : ''}`,
    })
    return NextResponse.json({ ok: true })
  }

  // ── Novos Membros: turma aberta ou fila de espera ──
  if (body.action === 'novosMembros') {
    if (body.classId) {
      const { data: turma } = await admin
        .from('new_members_classes').select('id, church_id, name, status, enrollment_open, day_of_week, time_start').eq('id', body.classId).maybeSingle()
      if (!turma || turma.church_id !== me.church_id || turma.status !== 'ativa') return NextResponse.json({ error: 'Turma não encontrada.' }, { status: 404 })
      const { error } = await admin.from('new_members_enrollments').upsert({ class_id: turma.id, person_id: person.id }, { onConflict: 'class_id,person_id' })
      if (error) return NextResponse.json({ error: 'Erro ao matricular.' }, { status: 500 })
      await admin.from('people').update({ status: 'em_novos_membros' }).eq('id', person.id)
      await admin.from('enrollment_waitlist').update({ status: 'matriculado' }).eq('person_id', person.id).eq('status', 'aguardando')
      await admin.from('journey_events').insert({ person_id: person.id, event_type: 'entrou_novos_membros', recorded_by: me.id, description: `Matriculado(a) pelo Conect na turma ${turma.name}` })
      if (person.phone) {
        sendAndLogWhatsApp({
          churchId: me.church_id, phone: person.phone, personId: person.id, messageType: 'boas_vindas_novos_membros',
          message: msgBoasVindasNovosMembros(person.full_name, turma.name, turma.day_of_week ? DAY_LABELS[turma.day_of_week] || turma.day_of_week : undefined, turma.time_start?.slice(0, 5)),
        }).catch(() => {})
      }
      return NextResponse.json({ ok: true, result: 'matriculado', className: turma.name })
    }

    const { data: waiting } = await admin.from('enrollment_waitlist').select('id').eq('person_id', person.id).eq('status', 'aguardando').maybeSingle()
    if (!waiting) {
      const { error } = await admin.from('enrollment_waitlist').insert({ church_id: me.church_id, person_id: person.id, status: 'aguardando' })
      if (error) return NextResponse.json({ error: 'Erro ao colocar na fila.' }, { status: 500 })
      await admin.from('journey_events').insert({ person_id: person.id, event_type: 'observacao', recorded_by: me.id, description: 'Quer fazer Novos Membros — colocado(a) na fila de espera pelo Conect' })
    }
    return NextResponse.json({ ok: true, result: 'fila' })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
