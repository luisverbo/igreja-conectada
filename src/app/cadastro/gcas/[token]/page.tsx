import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { GcaSignupForm, type GcaOption } from '@/components/cadastro/gca-signup-form'
import { leadersShort } from '@/lib/gca'

export const dynamic = 'force-dynamic'

const DAY: Record<string, string> = {
  domingo: 'Domingo', segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta',
  quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado',
}

/** Link GERAL da igreja: a pessoa escolhe o próprio GCA na lista. */
export default async function CadastroGcasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()

  const supabase = createAdminClient()
  const { data: church } = await supabase
    .from('churches').select('id, name').eq('gca_signup_token', token).maybeSingle()
  if (!church) notFound()

  const { data } = await supabase
    .from('discipleships')
    .select(`
      id, name, neighborhood, day_of_week, time_start, leader_name, leader2_name,
      leader:profiles!discipleships_leader_id_fkey(full_name),
      leader2:profiles!discipleships_leader2_id_fkey(full_name),
      location:gca_locations(neighborhood)
    `)
    .eq('church_id', church.id)
    .eq('status', 'ativo')
    .order('name')

  const gcas: GcaOption[] = (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    leaders: leadersShort(g),
    neighborhood: g.location?.neighborhood || g.neighborhood || null,
    day: g.day_of_week ? `${DAY[g.day_of_week] || g.day_of_week}${g.time_start ? ' ' + String(g.time_start).slice(0, 5) : ''}` : null,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-3">
            <span className="text-2xl">🏠</span>
          </div>
          <p className="text-sm font-medium text-violet-600 mb-1">{church.name}</p>
          <h1 className="text-2xl font-bold text-slate-900">Cadastro dos GCAs</h1>
          <p className="text-sm text-slate-500 mt-1">Escolha o seu GCA e preencha seus dados</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {gcas.length > 0
            ? <GcaSignupForm churchToken={token} gcas={gcas} />
            : <p className="text-center text-slate-500 py-6">Nenhum GCA ativo no momento.</p>}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
