import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { WelcomeForm } from './welcome-form'

export const dynamic = 'force-dynamic'

/** Link fixo do QR Code do balcão do Conect. */
export default async function BoasVindasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()

  const supabase = createAdminClient()
  const { data: church } = await supabase.from('churches').select('id, name').eq('welcome_token', token).maybeSingle()
  if (!church) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-slate-100 py-8 px-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 mb-3">
            <span className="text-2xl">🙌</span>
          </div>
          <p className="text-sm font-medium text-violet-600 mb-1">{church.name}</p>
          <h1 className="text-2xl font-bold text-slate-900">Seja bem-vindo(a)!</h1>
          <p className="text-sm text-slate-500 mt-1">Que alegria ter você aqui. Deixe seu contato para a gente caminhar junto com você.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <WelcomeForm token={token} />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
