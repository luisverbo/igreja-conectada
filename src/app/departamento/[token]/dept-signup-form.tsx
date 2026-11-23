'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function DeptSignupForm({ token, deptName }: { token: string; deptName: string }) {
  const [form, setForm] = useState({ full_name: '', phone: '', gender: '', birth_date: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.full_name.trim()) { setError('Escreva seu nome completo.'); return }
    if (form.phone.replace(/\D/g, '').length < 10) { setError('Informe seu WhatsApp com DDD.'); return }
    setLoading(true)
    const res = await fetch('/api/departamento-cadastro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, token }) })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erro ao enviar. Tente novamente.'); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Pronto! 🙌</h2>
        <p className="text-sm text-slate-600">Você está registrado(a) na equipe do <strong>{deptName}</strong>. Obrigado por servir!</p>
      </div>
    )
  }

  const input = 'w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'
  const label = 'block text-sm font-medium text-slate-700 mb-1'
  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className={label}>Nome completo *</label>
        <input value={form.full_name} onChange={e => set('full_name', e.target.value)} autoComplete="name" className={input} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>WhatsApp *</label>
          <input type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(21) 99999-9999" autoComplete="tel" className={input} />
        </div>
        <div>
          <label className={label}>Data de nascimento</label>
          <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Sexo</label>
        <div className="grid grid-cols-2 gap-2">
          {[['M', 'Masculino'], ['F', 'Feminino']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => set('gender', v)}
              className={`h-11 rounded-lg border-2 text-sm font-semibold ${form.gender === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>{l}</button>
          ))}
        </div>
      </div>
      {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {error}</div>}
      <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
        {loading && <Loader2 className="h-5 w-5 animate-spin" />} Entrar na equipe
      </button>
      <p className="text-[11px] text-slate-400 text-center">Se você já tem cadastro na igreja, usamos o mesmo — não duplica.</p>
    </form>
  )
}
