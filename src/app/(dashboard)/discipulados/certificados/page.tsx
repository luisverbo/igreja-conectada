import { getSessionProfile } from '@/lib/get-profile'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FULL_ACCESS } from '@/lib/roles'
import { CertificatesManager } from '@/components/certificados/certificates-manager'

export default async function CertificadosPage() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null

  const canManage = [...FULL_ACCESS, 'discipleship_supervisor'].includes(profile.role)
  if (!canManage) redirect('/discipulados')

  const [{ data: campaigns, error }, { data: certificates }] = await Promise.all([
    supabase.from('certificate_campaigns')
      .select('id, title, template, token, active, created_at')
      .eq('church_id', profile.church_id)
      .order('created_at', { ascending: false }),
    supabase.from('certificates')
      .select('id, campaign_id, name1, name2, created_at')
      .eq('church_id', profile.church_id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <Link href="/discipulados" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft className="h-4 w-4" /> GCA
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Certificados</h1>
        <p className="text-sm text-slate-500">Envie o link, os casais escrevem os nomes e você baixa tudo em PDF para imprimir.</p>
      </div>

      <div className="p-4 sm:p-6">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Os certificados ainda não estão ativados no banco de dados. Rode o SQL dos certificados no Supabase e recarregue a página.
          </div>
        ) : (
          <CertificatesManager churchId={profile.church_id} campaigns={campaigns || []} certificates={certificates || []} />
        )}
      </div>
    </div>
  )
}
