import { getSessionProfile } from '@/lib/get-profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { FULL_ACCESS } from '@/lib/roles'
import { AUDIENCE_META, type Audience } from '@/lib/survey'
import { NewSurveyDialog } from '@/components/gca/new-survey-dialog'

export default async function PesquisasPage() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null

  const canManage = [...FULL_ACCESS, 'discipleship_supervisor'].includes(profile.role)
  if (!canManage) redirect('/discipulados')

  const { data: surveys } = await supabase
    .from('surveys')
    .select('*, targets:survey_targets(id), responses:survey_responses(id)')
    .eq('church_id', profile.church_id)
    .order('created_at', { ascending: false })

  const { data: gcas } = await supabase
    .from('discipleships')
    .select('id, name')
    .eq('church_id', profile.church_id)
    .eq('status', 'ativo')
    .order('name')

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/discipulados" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft className="h-4 w-4" /> GCA
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pesquisas dos GCAs</h1>
            <p className="text-sm text-slate-500">
              Crie o formulário uma vez e vincule aos GCAs — cada um recebe seu link próprio.
            </p>
          </div>
          <NewSurveyDialog churchId={profile.church_id} userId={profile.id} gcas={gcas || []} />
        </div>
      </div>

      <div className="p-6">
        {!surveys || surveys.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 mb-1">Nenhuma pesquisa criada ainda</p>
            <p className="text-xs text-slate-400">Crie um formulário de acompanhamento para os GCAs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {surveys.map((s: any) => {
              const meta = AUDIENCE_META[s.audience as Audience]
              const respCount = s.responses?.length || 0
              const gcaCount = s.targets?.length || 0
              return (
                <Link
                  key={s.id}
                  href={`/discipulados/pesquisas/${s.id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-violet-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{meta?.emoji} {meta?.label}</p>
                    </div>
                    <Badge variant={s.active ? 'success' : 'outline'}>{s.active ? 'Ativa' : 'Encerrada'}</Badge>
                  </div>
                  {s.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{s.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>🏠 {gcaCount} GCA(s)</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {respCount} resposta(s)
                    </span>
                    <span>{(s.questions || []).length} pergunta(s)</span>
                    <span className="ml-auto">{formatDate(s.created_at)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
