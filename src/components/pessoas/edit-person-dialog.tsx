'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PERSON_STATUS_LABELS, type PersonStatus } from '@/lib/types'

interface Person {
  id: string
  full_name: string
  phone?: string | null
  birth_date?: string | null
  address?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  gender?: string | null
  origin?: string | null
  status: string
  can_serve: boolean
  notes?: string | null
}

interface Props {
  person: Person
}

const STATUS_OPTIONS: PersonStatus[] = [
  'novo', 'em_novos_membros', 'concluiu_novos_membros',
  'em_discipulado', 'em_acompanhamento', 'servindo', 'inativo',
]

export function EditPersonDialog({ person }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: person.full_name,
    phone: person.phone ?? '',
    birth_date: person.birth_date ?? '',
    address: person.address ?? '',
    neighborhood: person.neighborhood ?? '',
    city: person.city ?? '',
    state: person.state ?? '',
    gender: person.gender ?? '',
    origin: person.origin ?? '',
    status: person.status,
    can_serve: person.can_serve,
    notes: person.notes ?? '',
  })

  function set(k: string, v: string | boolean) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('people')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        gender: form.gender || null,
        origin: form.origin || null,
        status: form.status,
        can_serve: form.can_serve,
        notes: form.notes.trim() || null,
      })
      .eq('id', person.id)
    if (err) {
      setError('Erro ao salvar. Tente novamente.')
      setLoading(false)
      return
    }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Edit className="h-4 w-4 mr-2" />
        Editar
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Editar Pessoa</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Nome Completo *</label>
            <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Telefone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Data de Nascimento</label>
              <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Sexo</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputClass}>
                <option value="">Não informado</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{PERSON_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Origem</label>
            <select value={form.origin} onChange={e => set('origin', e.target.value)} className={inputClass}>
              <option value="">Não informado</option>
              <option value="aceitou_jesus_aqui">Aceitou Jesus aqui</option>
              <option value="veio_de_outra_igreja">Veio de outra igreja</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Bairro</label>
            <input type="text" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Cidade</label>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <input type="text" value={form.state} onChange={e => set('state', e.target.value)} maxLength={2} placeholder="UF" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Endereço</label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="can_serve"
              checked={form.can_serve}
              onChange={e => set('can_serve', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="can_serve" className="text-sm text-slate-700">Apto para servir</label>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
