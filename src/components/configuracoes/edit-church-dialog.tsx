'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Church {
  id: string
  name: string
  pastor_name: string | null
  email: string | null
  phone: string | null
  cnpj: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

interface Props {
  church: Church
}

export function EditChurchDialog({ church }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: church.name,
    pastor_name: church.pastor_name || '',
    email: church.email || '',
    phone: church.phone || '',
    cnpj: church.cnpj || '',
    address: church.address || '',
    neighborhood: church.neighborhood || '',
    city: church.city || '',
    state: church.state || '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('churches')
      .update({
        name: form.name.trim(),
        pastor_name: form.pastor_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        cnpj: form.cnpj.trim() || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
      })
      .eq('id', church.id)

    if (updateError) {
      setError('Erro ao salvar: ' + updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Editar Dados da Igreja</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Nome da Igreja *</label>
                <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Pastor</label>
                  <input type="text" value={form.pastor_name} onChange={e => set('pastor_name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CNPJ</label>
                  <input type="text" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Endereço</label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número" className={inputClass} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input type="text" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>UF</label>
                  <input type="text" maxLength={2} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} className={inputClass} />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
