'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const empty = {
  full_name: '', phone: '', origin: '', previous_church: '', gender: '', birth_date: '',
  cep: '', address: '', number: '', neighborhood: '', city: '', state: '',
}

export function WelcomeForm({ token }: { token: string }) {
  const [form, setForm] = useState(empty)
  const [cepLoading, setCepLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function set(k: keyof typeof empty, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function onCep(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    set('cep', digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const d = await res.json()
      if (!d.erro) setForm(p => ({ ...p, address: d.logradouro || p.address, neighborhood: d.bairro || p.neighborhood, city: d.localidade || p.city, state: d.uf || p.state }))
    } catch { /* preenche na mão */ }
    setCepLoading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.full_name.trim()) { setError('Escreva seu nome.'); return }
    if (form.phone.replace(/\D/g, '').length < 10) { setError('Informe seu WhatsApp com DDD.'); return }
    if (!form.origin) { setError('Conte pra gente como você chegou: aceitou Jesus ou veio de outra igreja.'); return }
    if (!form.gender) { setError('Informe o sexo.'); return }
    if (form.cep.replace(/\D/g, '').length !== 8) { setError('Informe o CEP da sua casa (8 números).'); return }
    setLoading(true)
    const res = await fetch('/api/boas-vindas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, token }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erro ao enviar. Tente novamente.'); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Cadastro feito! 🙌</h2>
        <p className="text-sm text-slate-600">
          {form.origin === 'aceitou_jesus_aqui'
            ? 'Que decisão linda! Em breve alguém da nossa equipe vai falar com você pelo WhatsApp.'
            : 'Que bom ter você com a gente! Em breve alguém da nossa equipe vai falar com você pelo WhatsApp.'}
        </p>
      </div>
    )
  }

  const input = 'w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'
  const label = 'block text-sm font-medium text-slate-700 mb-1'
  const choice = (on: boolean) => `rounded-xl border-2 px-3 py-3 text-sm font-semibold text-left transition-all ${on ? 'border-violet-600 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-600'}`

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className={label}>Como você chegou até nós? *</label>
        <div className="grid grid-cols-1 gap-2">
          <button type="button" onClick={() => set('origin', 'aceitou_jesus_aqui')} className={choice(form.origin === 'aceitou_jesus_aqui')}>
            🙏 Aceitei Jesus
            <span className="block text-xs font-normal text-slate-500 mt-0.5">Tomei a decisão de seguir Jesus</span>
          </button>
          <button type="button" onClick={() => set('origin', 'veio_de_outra_igreja')} className={choice(form.origin === 'veio_de_outra_igreja')}>
            ⛪ Já sou cristão(ã), vim de outra igreja
            <span className="block text-xs font-normal text-slate-500 mt-0.5">Quero fazer parte desta igreja</span>
          </button>
        </div>
      </div>

      {form.origin === 'veio_de_outra_igreja' && (
        <div>
          <label className={label}>De qual igreja você vem? <span className="text-slate-400 font-normal">(opcional)</span></label>
          <input value={form.previous_church} onChange={e => set('previous_church', e.target.value)} className={input} />
        </div>
      )}

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
        <label className={label}>Sexo *</label>
        <div className="grid grid-cols-2 gap-2">
          {[['M', 'Masculino'], ['F', 'Feminino']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => set('gender', v)}
              className={`h-11 rounded-lg border-2 text-sm font-semibold ${form.gender === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">📍 Onde você mora</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>CEP *</label>
            <div className="relative">
              <input inputMode="numeric" value={form.cep} onChange={e => onCep(e.target.value)} placeholder="00000-000" className={input} />
              {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-violet-500" />}
            </div>
          </div>
          <div>
            <label className={label}>Número</label>
            <input value={form.number} onChange={e => set('number', e.target.value)} className={input} />
          </div>
        </div>
        {(form.address || form.city) && (
          <p className="text-xs text-slate-500">{[form.address, form.neighborhood, form.city && `${form.city}${form.state ? '/' + form.state : ''}`].filter(Boolean).join(' · ')}</p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full h-12 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        Enviar
      </button>
      <p className="text-[11px] text-slate-400 text-center">Seus dados ficam com a liderança da igreja e são usados só para o cuidado pastoral.</p>
    </form>
  )
}
