import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { CertificateForm } from './certificate-form'

export const dynamic = 'force-dynamic'

/** Link público: o casal escreve os nomes e vê o certificado na hora. */
export default async function CertificadoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()

  const supabase = createAdminClient()
  const { data: campaign } = await supabase
    .from('certificate_campaigns')
    .select('id, title, template, active, church_id')
    .eq('token', token)
    .maybeSingle()
  if (!campaign) notFound()

  const { data: church } = await supabase.from('churches').select('name').eq('id', campaign.church_id).single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 py-8 px-4">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-5">
          {church && <p className="text-sm font-medium text-blue-800 mb-1">{church.name}</p>}
          <h1 className="text-2xl font-bold text-slate-900">{campaign.title}</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha os nomes do casal para o seu certificado</p>
        </div>

        {campaign.active
          ? <CertificateForm token={token} templateKey={campaign.template} />
          : (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-2xl mb-2">🔒</p>
              <p className="font-semibold text-slate-800">Este link já foi encerrado.</p>
              <p className="text-sm text-slate-500 mt-1">Fale com a liderança se precisar corrigir seu certificado.</p>
            </div>
          )}

        <p className="text-center text-xs text-slate-400 mt-6">Igreja Conectada · Sistema de Gestão</p>
      </div>
    </div>
  )
}
