import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APPROVERS = ['super_admin', 'pastor', 'coordinator', 'supervisor', 'discipleship_supervisor']

/**
 * Aprova ou rejeita uma solicitação de inclusão/transferência de GCA.
 * Só gestores de GCA (supervisor, pastor, coordenador, admin).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role, id').eq('id', user.id).single()
  if (!profile?.church_id || !APPROVERS.includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { requestId, action } = await req.json()
  if (!requestId || !['aprovar', 'rejeitar'].includes(action)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: reqRow } = await admin
    .from('gca_requests')
    .select('*')
    .eq('id', requestId)
    .eq('church_id', profile.church_id)
    .eq('status', 'pendente')
    .single()

  if (!reqRow) {
    return NextResponse.json({ error: 'Solicitação não encontrada ou já resolvida.' }, { status: 404 })
  }

  if (action === 'rejeitar') {
    await admin.from('gca_requests').update({
      status: 'rejeitado', resolved_by: profile.id, resolved_at: new Date().toISOString(),
    }).eq('id', requestId)
    return NextResponse.json({ ok: true, result: 'rejeitado' })
  }

  // Aprovar: executa a inclusão/transferência
  const { data: target } = await admin.from('discipleships').select('name').eq('id', reqRow.target_discipleship_id).single()

  // Desativa membership anterior (transferência)
  if (reqRow.from_discipleship_id) {
    await admin.from('discipleship_members')
      .update({ status: 'inativo' })
      .eq('person_id', reqRow.person_id)
      .eq('discipleship_id', reqRow.from_discipleship_id)
  }

  await admin.from('discipleship_members').upsert(
    { discipleship_id: reqRow.target_discipleship_id, person_id: reqRow.person_id, status: 'ativo' },
    { onConflict: 'discipleship_id,person_id' }
  )
  await admin.from('people').update({ status: 'em_discipulado' }).eq('id', reqRow.person_id)
  await admin.from('journey_events').insert({
    person_id: reqRow.person_id,
    event_type: 'entrou_discipulado',
    reference_id: reqRow.target_discipleship_id,
    reference_type: 'discipulado',
    description: reqRow.request_type === 'transferencia'
      ? `Transferência aprovada para ${target?.name || 'GCA'}`
      : `Inclusão aprovada no ${target?.name || 'GCA'} (sem NM concluído)`,
    recorded_by: profile.id,
  })

  await admin.from('gca_requests').update({
    status: 'aprovado', resolved_by: profile.id, resolved_at: new Date().toISOString(),
  }).eq('id', requestId)

  return NextResponse.json({ ok: true, result: 'aprovado' })
}
