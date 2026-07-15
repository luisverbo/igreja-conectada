import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MANAGERS = ['super_admin', 'pastor', 'coordinator', 'supervisor', 'discipleship_supervisor']
const CAN_REQUEST = [...MANAGERS, 'discipleship_leader']
const NM_DONE = ['concluiu_novos_membros', 'em_discipulado', 'em_acompanhamento', 'servindo', 'liberado_para_servir']

/**
 * Encaminha uma pessoa para um GCA aplicando as regras de negócio:
 * - Concluiu NM e não está em outro GCA → entra direto
 * - Não concluiu NM → gestor entra direto (autorizando); líder gera solicitação
 * - Já está em outro GCA ativo → gestor transfere direto; líder gera solicitação
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, id').eq('id', user.id).single()
  if (!profile?.church_id || !CAN_REQUEST.includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { personId, targetDiscipleshipId, reason } = await req.json()
  if (!personId || !targetDiscipleshipId) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const churchId = profile.church_id
  const actorId = profile.id
  const actorRole = profile.role
  const isManager = MANAGERS.includes(actorRole)

  const [{ data: person }, { data: target }] = await Promise.all([
    admin.from('people').select('id, full_name, church_id, status').eq('id', personId).single(),
    admin.from('discipleships').select('id, church_id, name').eq('id', targetDiscipleshipId).single(),
  ])

  if (!person || person.church_id !== churchId || !target || target.church_id !== churchId) {
    return NextResponse.json({ error: 'Pessoa ou GCA não encontrado.' }, { status: 404 })
  }

  // Já é membro ativo de algum GCA?
  const { data: currentMembership } = await admin
    .from('discipleship_members')
    .select('id, discipleship_id, discipleships(name)')
    .eq('person_id', personId)
    .neq('status', 'inativo')
    .maybeSingle()

  const alreadyInThis = currentMembership?.discipleship_id === targetDiscipleshipId
  if (alreadyInThis) {
    return NextResponse.json({ error: 'Esta pessoa já faz parte deste GCA.' }, { status: 400 })
  }

  const inAnotherGca = !!currentMembership
  const completedNm = NM_DONE.includes(person.status)

  // Executa a adição/transferência de fato
  async function doMove(note: string) {
    if (currentMembership) {
      await admin.from('discipleship_members').update({ status: 'inativo' }).eq('id', currentMembership.id)
    }
    await admin.from('discipleship_members').upsert(
      { discipleship_id: targetDiscipleshipId, person_id: personId, status: 'ativo' },
      { onConflict: 'discipleship_id,person_id' }
    )
    await admin.from('people').update({ status: 'em_discipulado' }).eq('id', personId)
    await admin.from('journey_events').insert({
      person_id: personId,
      event_type: 'entrou_discipulado',
      reference_id: targetDiscipleshipId,
      reference_type: 'discipulado',
      description: note,
      recorded_by: actorId,
    })
  }

  // CASO 1: transferência de outro GCA
  if (inAnotherGca) {
    const fromName = (currentMembership.discipleships as any)?.name || 'outro GCA'
    if (isManager) {
      await doMove(`Transferido de ${fromName} para ${target.name}`)
      return NextResponse.json({ ok: true, result: 'transferido' })
    }
    // Líder → solicitação
    await admin.from('gca_requests').insert({
      church_id: churchId,
      person_id: personId,
      target_discipleship_id: targetDiscipleshipId,
      from_discipleship_id: currentMembership.discipleship_id,
      request_type: 'transferencia',
      reason: reason || null,
      status: 'pendente',
      requested_by: actorId,
    })
    return NextResponse.json({ ok: true, result: 'solicitacao_transferencia', fromName })
  }

  // CASO 2: não concluiu NM
  if (!completedNm) {
    if (isManager) {
      await doMove(`Incluído no ${target.name} sem NM concluído (autorizado por ${actorRole.replace(/_/g, ' ')})`)
      return NextResponse.json({ ok: true, result: 'incluido_autorizado' })
    }
    await admin.from('gca_requests').insert({
      church_id: churchId,
      person_id: personId,
      target_discipleship_id: targetDiscipleshipId,
      request_type: 'inclusao_sem_nm',
      reason: reason || null,
      status: 'pendente',
      requested_by: actorId,
    })
    return NextResponse.json({ ok: true, result: 'solicitacao_inclusao' })
  }

  // CASO 3: concluiu NM e não está em GCA → entra direto (qualquer papel)
  await doMove(`Encaminhado ao ${target.name} após concluir Novos Membros`)
  return NextResponse.json({ ok: true, result: 'incluido' })
}
