import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { AUDIENCE_META, type Audience } from '@/lib/survey'
import { SurveyForm } from './survey-form'

export const dynamic = 'force-dynamic'

export default async function PesquisaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: target } = await supabase
    .from('survey_targets')
    .select(`
      id, discipleship_id,
      survey:surveys(id, title, description, audience, questions, allow_anonymous, active, church_id),
      gca:discipleships(
        id, name, leader2_name,
        leader:profiles!discipleships_leader_id_fkey(full_name),
        leader2:profiles!discipleships_leader2_id_fkey(full_name),
        location:gca_locations(name, host_name)
      )
    `)
    .eq('token', token)
    .single()

  const survey = target?.survey as any
  const gca = target?.gca as any
  if (!target || !survey) notFound()

  const { data: church } = await supabase
    .from('churches').select('name').eq('id', survey.church_id).single()

  if (!survey.active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 mb-4"><span className="text-2xl">🔒</span></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Pesquisa encerrada</h1>
          <p className="text-slate-500">A pesquisa <strong>{survey.title}</strong> não está mais recebendo respostas.</p>
        </div>
      </div>
    )
  }

  const audience: Audience = survey.audience
  const meta = AUDIENCE_META[audience]

  // Quem pode responder, conforme o público-alvo
  let people: { id: string | null; name: string; role: string }[] = []

  if (audience === 'membros') {
    const { data: members } = await supabase
      .from('discipleship_members')
      .select('person_id, people(id, full_name)')
      .eq('discipleship_id', target.discipleship_id)
      .neq('status', 'inativo')
    people = (members || [])
      .map((m: any) => ({ id: m.people?.id ?? null, name: m.people?.full_name ?? '', role: 'membro' }))
      .filter(p => p.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  } else if (audience === 'lideres') {
    const l1 = gca?.leader?.full_name
    const l2 = gca?.leader2?.full_name || gca?.leader2_name
    if (l1) people.push({ id: null, name: l1, role: 'lider' })
    if (l2) people.push({ id: null, name: l2, role: 'lider' })
  } else if (audience === 'anfitrioes') {
    const host = gca?.location?.host_name
    if (host) people.push({ id: null, name: host, role: 'anfitriao' })
  }

  const leaderNames = [gca?.leader?.full_name, gca?.leader2?.full_name || gca?.leader2_name].filter(Boolean)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-3">
            <span className="text-2xl">📝</span>
          </div>
          {church && <p className="text-sm font-medium text-violet-600 mb-1">{church.name}</p>}
          <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
          {survey.description && <p className="text-sm text-slate-500 mt-1">{survey.description}</p>}
        </div>

        {/* Identificação do GCA — o respondente sempre sabe de onde é a pesquisa */}
        <div className="rounded-xl bg-white border border-violet-200 px-4 py-3 mb-4">
          <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Esta pesquisa é do</p>
          <p className="text-base font-bold text-violet-800">🏠 {gca?.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {leaderNames.length > 0 && <>Líder(es): {leaderNames.join(' & ')}</>}
            {gca?.location?.host_name && <> · Anfitrião: {gca.location.host_name}</>}
          </p>
          <p className="text-xs text-violet-600 mt-1.5">{meta.emoji} Para: {meta.label}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <SurveyForm
            token={token}
            questions={survey.questions || []}
            audience={audience}
            allowAnonymous={!!survey.allow_anonymous}
            people={people}
            gcaName={gca?.name || ''}
          />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
