import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { GcaSignupForm } from '@/components/cadastro/gca-signup-form'
import { leadersFull } from '@/lib/gca'

export const dynamic = 'force-dynamic'

/** Link fixo de UM GCA — o líder manda no grupo de WhatsApp dele. */
export default async function CadastroGcaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // Token inválido (não-UUID) faria o Postgres dar erro em vez de "não achou"
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()

  const supabase = createAdminClient()
  const { data: gca } = await supabase
    .from('discipleships')
    .select(`
      id, name, status, church_id, leader_name, leader2_name,
      leader:profiles!discipleships_leader_id_fkey(full_name),
      leader2:profiles!discipleships_leader2_id_fkey(full_name)
    `)
    .eq('signup_token', token)
    .maybeSingle()

  if (!gca) notFound()

  const { data: church } = await supabase.from('churches').select('name').eq('id', gca.church_id).single()
  const leaders = leadersFull(gca as any)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-3">
            <span className="text-2xl">🏠</span>
          </div>
          {church && <p className="text-sm font-medium text-violet-600 mb-1">{church.name}</p>}
          <h1 className="text-2xl font-bold text-slate-900">Cadastro do GCA</h1>
          <p className="text-base font-semibold text-violet-800 mt-1">{gca.name}</p>
          {leaders && <p className="text-xs text-slate-500 mt-0.5">Líder(es): {leaders}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {gca.status === 'ativo'
            ? <GcaSignupForm gcaToken={token} />
            : <p className="text-center text-slate-500 py-6">Este GCA não está recebendo cadastros no momento.</p>}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
