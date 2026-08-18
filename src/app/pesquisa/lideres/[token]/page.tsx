import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { AUDIENCE_META, type Audience } from '@/lib/survey'
import { LeaderPicker } from './leader-picker'

export const dynamic = 'force-dynamic'

/**
 * Link ÚNICO para o grupo de líderes: cada líder se identifica e
 * recebe o link exclusivo do GCA dele — sem precisar mandar link
 * por link no privado.
 */
export default async function HubLideresPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: survey } = await supabase
    .from('surveys')
    .select('id, title, description, audience, active, church_id')
    .eq('leaders_token', token)
    .single()

  if (!survey) notFound()

  const { data: church } = await supabase
    .from('churches').select('name').eq('id', survey.church_id).single()

  if (!survey.active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 mb-4"><span className="text-2xl">🔒</span></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Pesquisa encerrada</h1>
          <p className="text-slate-500">A pesquisa <strong>{survey.title}</strong> não está mais ativa.</p>
        </div>
      </div>
    )
  }

  const { data: targets } = await supabase
    .from('survey_targets')
    .select(`
      token,
      gca:discipleships(
        id, name, leader2_name,
        leader:profiles!discipleships_leader_id_fkey(full_name),
        leader2:profiles!discipleships_leader2_id_fkey(full_name),
        location:gca_locations(name, host_name)
      )
    `)
    .eq('survey_id', survey.id)

  // Uma entrada por LÍDER (o líder acha o próprio nome na lista)
  const entries: { key: string; leaderName: string; gcaName: string; token: string; hostName?: string }[] = []
  for (const t of targets || []) {
    const g = t.gca as any
    if (!g) continue
    const names = [g.leader?.full_name, g.leader2?.full_name || g.leader2_name].filter(Boolean)
    if (names.length === 0) {
      entries.push({ key: `${t.token}-gca`, leaderName: `(sem líder cadastrado)`, gcaName: g.name, token: t.token, hostName: g.location?.host_name })
    }
    names.forEach((n: string, i: number) => {
      entries.push({ key: `${t.token}-${i}`, leaderName: n, gcaName: g.name, token: t.token, hostName: g.location?.host_name })
    })
  }
  entries.sort((a, b) => a.leaderName.localeCompare(b.leaderName))

  const audience: Audience = survey.audience as Audience
  const meta = AUDIENCE_META[audience]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-3">
            <span className="text-2xl">📋</span>
          </div>
          {church && <p className="text-sm font-medium text-violet-600 mb-1">{church.name}</p>}
          <h1 className="text-2xl font-bold text-slate-900">{survey.title}</h1>
          {survey.description && <p className="text-sm text-slate-500 mt-1">{survey.description}</p>}
          <p className="text-xs text-violet-600 mt-2">{meta.emoji} Público: {meta.label}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <LeaderPicker entries={entries} audience={audience} />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
