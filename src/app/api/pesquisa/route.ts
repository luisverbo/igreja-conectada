import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Submissão pública de uma resposta de pesquisa.
 * O token identifica o vínculo pesquisa ↔ GCA, então cada GCA tem
 * suas próprias respostas mesmo com um único formulário.
 */
export async function POST(req: NextRequest) {
  const { token, respondentName, respondentRole, personId, answers } = await req.json()

  if (!token || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: target } = await supabase
    .from('survey_targets')
    .select('id, discipleship_id, survey:surveys(id, church_id, audience, active, allow_anonymous, questions)')
    .eq('token', token)
    .single()

  const survey = target?.survey as any
  if (!target || !survey || !survey.active) {
    return NextResponse.json({ error: 'Pesquisa não encontrada ou encerrada.' }, { status: 404 })
  }

  // Pesquisa de MEMBROS não aceita resposta de líder/anfitrião
  if (survey.audience === 'membros' && ['lider', 'anfitriao'].includes(respondentRole)) {
    return NextResponse.json(
      { error: 'Esta pesquisa é somente para os membros do GCA.' },
      { status: 403 }
    )
  }

  // Identificação obrigatória quando a pesquisa não é anônima
  if (!survey.allow_anonymous && !respondentName?.trim() && !personId) {
    return NextResponse.json({ error: 'Identifique-se para enviar a resposta.' }, { status: 400 })
  }

  // Perguntas obrigatórias
  const required = (survey.questions || []).filter((q: any) => q.required)
  for (const q of required) {
    const v = answers[q.id]
    if (v === undefined || v === null || String(v).trim() === '') {
      return NextResponse.json({ error: `Responda: ${q.label}` }, { status: 400 })
    }
  }

  const { error } = await supabase.from('survey_responses').insert({
    church_id: survey.church_id,
    survey_id: survey.id,
    target_id: target.id,
    discipleship_id: target.discipleship_id,
    respondent_name: respondentName?.trim() || null,
    respondent_role: respondentRole || null,
    person_id: personId || null,
    answers,
  })

  if (error) {
    return NextResponse.json({ error: 'Erro ao enviar resposta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
