'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  classId: string
  churchId: string
  token: string
}

export function EnrollmentForm({ classId, churchId, token }: Props) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', birth_date: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/inscricao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, churchId, token, ...form }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Erro ao realizar inscrição. Tente novamente.')
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h3 className="text-lg font-bold text-slate-900">Inscrição realizada!</h3>
        <p className="text-sm text-slate-500">
          Obrigado, <strong>{form.full_name}</strong>! Sua inscrição foi confirmada. Te esperamos na turma!
        </p>
      </div>
    )
  }

  const inputClass = "w-full h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Nome completo *</label>
        <input
          type="text"
          required
          value={form.full_name}
          onChange={e => set('full_name', e.target.value)}
          placeholder="Seu nome completo"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Telefone / WhatsApp *</label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="(11) 99999-9999"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>E-mail <span className="text-slate-400 font-normal">(opcional)</span></label>
        <input
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder="seu@email.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Data de nascimento <span className="text-slate-400 font-normal">(opcional)</span></label>
        <input
          type="date"
          value={form.birth_date}
          onChange={e => set('birth_date', e.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700 transition-colors"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Inscrevendo...</> : 'Confirmar Inscrição'}
      </button>
    </form>
  )
}
