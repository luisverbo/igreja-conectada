'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, CheckCircle, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  churchId: string
  userId: string
  userName: string
}

export function CounselorNewConvert({ churchId, userId, userName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', birth_date: '', address: '' })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    const { data: person, error: personError } = await supabase
      .from('people')
      .insert({
        church_id: churchId,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        address: form.address.trim() || null,
        accepted_jesus_at: new Date().toISOString().split('T')[0],
        status: 'novo',
        can_serve: false,
        created_by: userId,
      })
      .select()
      .single()

    if (personError || !person) {
      setError('Erro ao cadastrar. Tente novamente.')
      setLoading(false)
      return
    }

    await supabase.from('journey_events').insert([
      { person_id: person.id, event_type: 'cadastrado', recorded_by: userId },
      { person_id: person.id, event_type: 'aceitou_jesus', recorded_by: userId },
    ])

    setSuccess(form.full_name.trim())
    setForm({ full_name: '', phone: '', birth_date: '', address: '' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Novo Convertido</h1>
          <p className="text-sm text-slate-500">Preencha os dados abaixo</p>
        </div>
      </div>

      {/* Feedback de sucesso */}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800">{success} cadastrado(a)!</p>
            <p className="text-sm text-emerald-600 mt-0.5">Pode cadastrar o próximo.</p>
          </div>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Nome Completo <span className="text-violet-600">*</span>
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Nome do convertido"
            required
            className="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Telefone / WhatsApp <span className="text-violet-600">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="(11) 99999-9999"
            required
            className="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Data de Nascimento <span className="text-violet-600">*</span>
          </label>
          <input
            type="date"
            value={form.birth_date}
            onChange={e => set('birth_date', e.target.value)}
            required
            className="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Endereço <span className="text-slate-400 font-normal text-xs">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Rua, número, bairro..."
            className="w-full h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <span className="opacity-70">Cadastrando...</span>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Cadastrar Convertido
            </>
          )}
        </button>
      </form>
    </div>
  )
}
