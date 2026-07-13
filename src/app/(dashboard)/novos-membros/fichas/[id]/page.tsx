import { getSessionProfile } from '@/lib/get-profile'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FICHA_STATUS_LABELS } from './labels'
import { PrintButton } from './print-button'

export default async function FichaViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null

  const { data: ficha } = await supabase
    .from('student_forms')
    .select('*, class:new_members_classes(name), filledByProfile:profiles!student_forms_filled_by_fkey(full_name)')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (!ficha) notFound()

  const courseLabel = (v: string | null) =>
    v === 'concluiu' ? 'Já concluiu' : v === 'fazendo' ? 'Está fazendo' : 'Ainda não fez'
  const fmt = (v: string | null) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '—'

  const rows: [string, string][] = [
    ['Nome', ficha.full_name],
    ['Sexo', ficha.gender === 'M' ? 'Masculino' : ficha.gender === 'F' ? 'Feminino' : '—'],
    ['Grau de instrução', ficha.education_level || '—'],
    ['Formação', ficha.formation || '—'],
    ['É empresário', ficha.is_entrepreneur ? 'Sim' : 'Não'],
    ['Profissão', ficha.profession || '—'],
    ['CPF', ficha.cpf || (ficha.has_cpf ? '—' : 'Não tem CPF')],
    ['RG', ficha.rg ? `${ficha.rg}${ficha.rg_ssp ? ` / ${ficha.rg_ssp}` : ''}` : '—'],
    ['Naturalidade', ficha.naturalidade || '—'],
    ['Nacionalidade', ficha.nacionalidade || '—'],
    ['Data de nascimento', fmt(ficha.birth_date)],
    ['Estado civil', ficha.marital_status || '—'],
    ...(ficha.marital_status === 'CASADO (A)' ? [
      ['Cônjuge', ficha.spouse_name || '—'] as [string, string],
      ['Data do casamento', fmt(ficha.marriage_date)] as [string, string],
    ] : []),
    ['Endereço', [ficha.address, ficha.number, ficha.complement].filter(Boolean).join(', ') || '—'],
    ['Bairro / Sub bairro', [ficha.neighborhood, ficha.sub_neighborhood].filter(Boolean).join(' / ') || '—'],
    ['Cidade / Estado', [ficha.city, ficha.state].filter(Boolean).join(' / ') || '—'],
    ['CEP', ficha.cep || '—'],
    ['País', ficha.country || '—'],
    ['Telefone 01', ficha.phone1 ? `${ficha.phone1} (${ficha.phone1_op})${ficha.phone1_whatsapp ? ' · WhatsApp' : ''}` : '—'],
    ['Telefone 02', ficha.phone2 ? `${ficha.phone2} (${ficha.phone2_op})${ficha.phone2_whatsapp ? ' · WhatsApp' : ''}` : '—'],
    ['E-mail', ficha.email || '—'],
    ['Facebook', ficha.facebook || '—'],
    ['Instagram', ficha.instagram || '—'],
    ['RHEMA', courseLabel(ficha.rhema)],
    ['EMR', courseLabel(ficha.emr)],
    ['ERMM', courseLabel(ficha.ermm)],
    ['Novo Nascimento', fmt(ficha.novo_nascimento)],
    ['Batismo no Espírito Santo', ficha.batismo_espirito_santo === 'sim' ? 'Sim' : 'Não'],
    ['Batismo nas águas', ficha.batismo_aguas === 'sim' ? `Sim${ficha.batismo_aguas_como ? ` (${ficha.batismo_aguas_como})` : ''}` : 'Não'],
    ['Observações', ficha.observacoes || '—'],
  ]

  const dependents = Array.isArray(ficha.dependents) ? ficha.dependents : []

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-6 py-4 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href={ficha.class_id ? `/novos-membros/turmas/${ficha.class_id}` : '/novos-membros'} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Voltar à turma
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 print:p-0">
        <div className="bg-white rounded-2xl border border-slate-200 print:border-0 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Ficha de Novos Membros</h1>
              <p className="text-sm text-slate-500">
                Turma: {(ficha as any).class?.name || '—'} · Preenchida em {new Date(ficha.filled_at).toLocaleDateString('pt-BR')}
                {(ficha as any).filledByProfile?.full_name && ` por ${(ficha as any).filledByProfile.full_name} (voluntário)`}
              </p>
            </div>
            {ficha.photo_url && (
              <img src={ficha.photo_url} alt="Foto" className="h-24 w-24 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
            )}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-col border-b border-slate-50 pb-1.5">
                <dt className="text-xs text-slate-400 uppercase tracking-wide">{k}</dt>
                <dd className="text-sm text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>

          {dependents.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-bold text-violet-700 uppercase tracking-wide mb-2">Dependentes</p>
              <ul className="space-y-1">
                {dependents.map((d: any, i: number) => (
                  <li key={i} className="text-sm text-slate-700">
                    {d.name}{d.birth_date && ` — ${new Date(d.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5">
            <p className="text-sm text-emerald-700">✓ Estatuto lido e aceito pelo aluno.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
