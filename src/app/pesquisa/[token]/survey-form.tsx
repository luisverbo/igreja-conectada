'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Star } from 'lucide-react'
import type { SurveyQuestion, Audience } from '@/lib/survey'

interface Props {
  token: string
  questions: SurveyQuestion[]
  audience: Audience
  allowAnonymous: boolean
  people: { id: string | null; name: string; role: string }[]
  gcaName: string
}

export function SurveyForm({ token, questions, audience, allowAnonymous, people, gcaName }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [who, setWho] = useState<string>('')       // índice na lista ou 'outro'
  const [otherName, setOtherName] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleForAudience = audience === 'lideres' ? 'lider'
    : audience === 'anfitrioes' ? 'anfitriao'
    : audience === 'membros' ? 'membro' : 'supervisor'

  function setAnswer(id: string, value: any) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let respondentName: string | null = null
    let personId: string | null = null

    if (who === 'outro') {
      respondentName = otherName.trim() || null
    } else if (who !== '' && who !== 'anonimo') {
      const p = people[Number(who)]
      respondentName = p?.name ?? null
      personId = p?.id ?? null
    }

    const res = await fetch('/api/pesquisa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        respondentName,
        respondentRole: who === 'anonimo' ? null : roleForAudience,
        personId,
        answers,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erro ao enviar.'); return }
    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h3 className="text-xl font-bold text-slate-900">Resposta enviada!</h3>
        <p className="text-sm text-slate-500">
          Obrigado por contribuir com o <strong>{gcaName}</strong>. Sua resposta ajuda a melhorar o cuidado do nosso GCA. 💜
        </p>
      </div>
    )
  }

  const input = "w-full h-11 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const label = "block text-sm font-semibold text-slate-800 mb-1.5"

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Identificação */}
      <div>
        <label className={label}>
          Quem está respondendo? {!allowAnonymous && <span className="text-violet-600">*</span>}
        </label>
        {people.length > 0 ? (
          <select
            value={who}
            onChange={e => setWho(e.target.value)}
            required={!allowAnonymous}
            className={input}
          >
            <option value="">Selecione seu nome</option>
            {people.map((p, i) => <option key={i} value={String(i)}>{p.name}</option>)}
            <option value="outro">Outro nome (não está na lista)</option>
            {allowAnonymous && <option value="anonimo">Prefiro não me identificar</option>}
          </select>
        ) : (
          <input
            value={otherName}
            onChange={e => { setOtherName(e.target.value); setWho('outro') }}
            placeholder="Seu nome"
            required={!allowAnonymous}
            className={input}
          />
        )}
        {who === 'outro' && people.length > 0 && (
          <input
            value={otherName}
            onChange={e => setOtherName(e.target.value)}
            placeholder="Digite seu nome"
            className={`${input} mt-2`}
            required={!allowAnonymous}
          />
        )}
        {audience === 'membros' && (
          <p className="text-xs text-amber-600 mt-1.5">
            ⚠️ Esta pesquisa é para os <strong>membros</strong> do GCA — o líder não deve responder.
          </p>
        )}
      </div>

      {/* Perguntas */}
      {questions.map((q, idx) => (
        <div key={q.id}>
          <label className={label}>
            {idx + 1}. {q.label} {q.required && <span className="text-violet-600">*</span>}
          </label>

          {q.type === 'texto' && (
            <input
              value={answers[q.id] || ''}
              onChange={e => setAnswer(q.id, e.target.value)}
              required={q.required}
              className={input}
            />
          )}

          {q.type === 'longo' && (
            <textarea
              value={answers[q.id] || ''}
              onChange={e => setAnswer(q.id, e.target.value)}
              rows={4}
              required={q.required}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          )}

          {q.type === 'escala' && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(q.id, n)}
                  className={`flex-1 h-12 rounded-xl border-2 font-bold transition-all flex items-center justify-center gap-1 ${
                    answers[q.id] === n
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-slate-200 text-slate-500 hover:border-violet-300'
                  }`}
                >
                  <Star className={`h-4 w-4 ${answers[q.id] === n ? 'fill-white' : ''}`} /> {n}
                </button>
              ))}
            </div>
          )}

          {q.type === 'sim_nao' && (
            <div className="flex gap-2">
              {['Sim', 'Não'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAnswer(q.id, v)}
                  className={`flex-1 h-11 rounded-xl border-2 font-semibold text-sm transition-all ${
                    answers[q.id] === v
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {q.type === 'opcoes' && (
            <div className="space-y-1.5">
              {(q.options || []).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(q.id, opt)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-2.5 text-sm transition-all ${
                    answers[q.id] === opt
                      ? 'border-violet-600 bg-violet-50 text-violet-800 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700"
      >
        {loading ? <><Loader2 className="h-5 w-5 animate-spin" />Enviando...</> : 'Enviar resposta'}
      </button>
    </form>
  )
}
