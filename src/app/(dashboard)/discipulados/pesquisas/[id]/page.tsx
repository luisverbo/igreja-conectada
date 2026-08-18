import { getSessionProfile } from '@/lib/get-profile'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { FULL_ACCESS } from '@/lib/roles'
import { AUDIENCE_META, type Audience, type SurveyQuestion } from '@/lib/survey'
import { LeadersHubLink, TargetLinksList } from '@/components/gca/survey-links'
import { SurveyToggle } from '@/components/gca/survey-toggle'

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null

  const canManage = [...FULL_ACCESS, 'discipleship_supervisor'].includes(profile.role)
  if (!canManage) redirect('/discipulados')

  const [{ data: survey }, { data: targets }, { data: responses }] = await Promise.all([
    supabase.from('surveys').select('*').eq('id', id).eq('church_id', profile.church_id).single(),
    supabase.from('survey_targets').select('id, token, gca:discipleships(id, name)').eq('survey_id', id),
    supabase
      .from('survey_responses')
      .select('id, respondent_name, respondent_role, answers, created_at, discipleship_id, gca:discipleships(name)')
      .eq('survey_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!survey) notFound()

  const questions: SurveyQuestion[] = survey.questions || []
  const meta = AUDIENCE_META[survey.audience as Audience]

  // Contagem de respostas por GCA
  const respByGca: Record<string, number> = {}
  responses?.forEach(r => {
    if (r.discipleship_id) respByGca[r.discipleship_id] = (respByGca[r.discipleship_id] || 0) + 1
  })

  const targetList = (targets || []).map((t: any) => ({
    token: t.token,
    gcaName: t.gca?.name || '—',
    responses: respByGca[t.gca?.id] || 0,
  })).sort((a, b) => a.gcaName.localeCompare(b.gcaName))

  // Média das perguntas de escala
  const scaleAverages = questions
    .filter(q => q.type === 'escala')
    .map(q => {
      const vals = (responses || [])
        .map(r => Number((r.answers as any)?.[q.id]))
        .filter(v => !isNaN(v) && v > 0)
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      return { label: q.label, avg, count: vals.length }
    })

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/discipulados/pesquisas" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft className="h-4 w-4" /> Pesquisas
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{survey.title}</h1>
              <Badge variant={survey.active ? 'success' : 'outline'}>{survey.active ? 'Ativa' : 'Encerrada'}</Badge>
            </div>
            {survey.description && <p className="text-sm text-slate-500 mt-1">{survey.description}</p>}
            <p className="text-xs text-violet-600 mt-1.5">{meta?.emoji} {meta?.label} · {questions.length} pergunta(s) · {responses?.length || 0} resposta(s)</p>
          </div>
          <SurveyToggle surveyId={survey.id} active={survey.active} />
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <LeadersHubLink token={survey.leaders_token} audience={survey.audience} />
          <TargetLinksList targets={targetList} />
        </div>

        {/* Médias das notas */}
        {scaleAverages.length > 0 && (responses?.length || 0) > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Médias das avaliações</h3>
            <div className="space-y-3">
              {scaleAverages.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline text-sm mb-1">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {s.avg !== null ? <>{s.avg.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 5 ({s.count})</span></> : '—'}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (s.avg || 0) >= 4 ? 'bg-emerald-500' : (s.avg || 0) >= 3 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${((s.avg || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Respostas */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">Respostas recebidas ({responses?.length || 0})</h3>
          </div>

          {!responses || responses.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">Nenhuma resposta ainda — compartilhe os links acima.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {responses.map((r: any) => (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {r.respondent_name || <span className="text-slate-400 italic">Anônimo</span>}
                        {r.respondent_role && <span className="text-xs font-normal text-slate-400 ml-1.5">({r.respondent_role})</span>}
                      </p>
                      <p className="text-xs text-violet-600">🏠 {r.gca?.name || '—'}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {questions.map(q => {
                      const v = (r.answers as any)?.[q.id]
                      if (v === undefined || v === null || v === '') return null
                      return (
                        <div key={q.id} className="text-sm">
                          <span className="text-slate-500">{q.label}: </span>
                          {q.type === 'escala' ? (
                            <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                              {v} <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            </span>
                          ) : (
                            <span className="text-slate-800 font-medium">{String(v)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
