'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Clock, BookOpen } from 'lucide-react'

interface OpenClass {
  id: string
  name: string
  day_of_week: string | null
  time_start: string | null
  location: string | null
  start_date: string | null
}

interface Props {
  churchId: string
  token: string
  openClasses: OpenClass[]
}

const DAY_LABELS: Record<string, string> = {
  domingo: 'Domingo', segunda: 'Segunda-feira', terca: 'Terça-feira',
  quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
}

export function ChurchEnrollmentForm({ churchId, token, openClasses }: Props) {
  const hasOpenClass = openClasses.length > 0
  const [selectedClass, setSelectedClass] = useState<string>(openClasses[0]?.id || '')
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', birth_date: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<'matriculado' | 'fila' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const endpoint = hasOpenClass ? '/api/inscricao' : '/api/inscricao/fila'
    const body = hasOpenClass
      ? { classId: selectedClass, churchId, churchToken: token, ...form }
      : { churchToken: token, ...form }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Erro ao enviar. Tente novamente.')
    } else {
      setSuccess(hasOpenClass ? 'matriculado' : 'fila')
    }
  }

  if (success === 'matriculado') {
    const turma = openClasses.find(c => c.id === selectedClass)
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h3 className="text-lg font-bold text-slate-900">Inscrição confirmada!</h3>
        <p className="text-sm text-slate-500">
          <strong>{form.full_name}</strong>, você está matriculado(a) na turma <strong>{turma?.name}</strong>.
          {turma?.day_of_week && ` Te esperamos ${DAY_LABELS[turma.day_of_week]?.toLowerCase()}`}
          {turma?.time_start && ` às ${turma.time_start.slice(0, 5)}`}!
        </p>
      </div>
    )
  }

  if (success === 'fila') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Clock className="h-12 w-12 text-violet-500" />
        <h3 className="text-lg font-bold text-slate-900">Você está na lista!</h3>
        <p className="text-sm text-slate-500">
          <strong>{form.full_name}</strong>, no momento não há turma com inscrições abertas —
          mas assim que uma nova turma abrir, você será matriculado(a) automaticamente
          e avisado(a) pelo WhatsApp. 💜
        </p>
      </div>
    )
  }

  const inputClass = "w-full h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <div className="space-y-5">
      {hasOpenClass ? (
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Inscrição aberta! 🎉</h2>
          <p className="text-sm text-slate-500 mb-4">
            {openClasses.length === 1 ? 'Preencha seus dados para participar.' : 'Escolha a turma e preencha seus dados.'}
          </p>

          <div className="space-y-2">
            {openClasses.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClass(c.id)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                  selectedClass === c.id
                    ? 'border-violet-600 bg-violet-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className={`h-4 w-4 flex-shrink-0 ${selectedClass === c.id ? 'text-violet-600' : 'text-slate-400'}`} />
                  <p className={`text-sm font-bold ${selectedClass === c.id ? 'text-violet-900' : 'text-slate-800'}`}>{c.name}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  {[
                    c.day_of_week ? DAY_LABELS[c.day_of_week] : null,
                    c.time_start ? `às ${c.time_start.slice(0, 5)}` : null,
                    c.location,
                  ].filter(Boolean).join(' · ') || 'Horário a definir'}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
          <h2 className="text-sm font-bold text-violet-900 mb-1">📋 Lista de espera</h2>
          <p className="text-xs text-violet-700">
            No momento não há turma com inscrições abertas. Deixe seus dados e você será
            matriculado(a) automaticamente na próxima turma — e avisado(a) pelo WhatsApp!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nome completo *</label>
          <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Seu nome completo" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Telefone / WhatsApp *</label>
          <input type="tel" required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>E-mail <span className="text-slate-400 font-normal">(opcional)</span></label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Data de nascimento <span className="text-slate-400 font-normal">(opcional)</span></label>
          <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={inputClass} />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (hasOpenClass && !selectedClass)}
          className="w-full h-11 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700 transition-colors"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
            : hasOpenClass ? 'Confirmar Inscrição' : 'Entrar na Lista de Espera'}
        </button>
      </form>
    </div>
  )
}
