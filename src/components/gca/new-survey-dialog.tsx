'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  QUESTION_TYPES, AUDIENCE_META, newQuestionId,
  type SurveyQuestion, type QuestionType, type Audience,
} from '@/lib/survey'

interface Props {
  churchId: string
  userId: string
  gcas: { id: string; name: string }[]
}

export function NewSurveyDialog({ churchId, userId, gcas }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [audience, setAudience] = useState<Audience>('lideres')
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { id: newQuestionId(), type: 'escala', label: '', required: true },
  ])
  const [selectedGcas, setSelectedGcas] = useState<string[]>(gcas.map(g => g.id))

  function addQuestion() {
    setQuestions(q => [...q, { id: newQuestionId(), type: 'texto', label: '', required: false }])
  }
  function updateQuestion(id: string, patch: Partial<SurveyQuestion>) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q))
  }
  function removeQuestion(id: string) {
    setQuestions(qs => qs.filter(q => q.id !== id))
  }
  function toggleGca(id: string) {
    setSelectedGcas(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const cleanQuestions = questions
      .filter(q => q.label.trim())
      .map(q => ({
        ...q,
        label: q.label.trim(),
        options: q.type === 'opcoes'
          ? (q.options || []).map(o => o.trim()).filter(Boolean)
          : undefined,
      }))

    if (!title.trim()) { setError('Dê um título à pesquisa.'); return }
    if (cleanQuestions.length === 0) { setError('Adicione ao menos uma pergunta.'); return }
    if (selectedGcas.length === 0) { setError('Selecione ao menos um GCA.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    const { data: survey, error: sErr } = await supabase
      .from('surveys')
      .insert({
        church_id: churchId,
        title: title.trim(),
        description: description.trim() || null,
        audience,
        questions: cleanQuestions,
        allow_anonymous: allowAnonymous,
        active: true,
        created_by: userId,
      })
      .select('id')
      .single()

    if (sErr || !survey) {
      setError('Erro ao criar pesquisa: ' + (sErr?.message || ''))
      setSaving(false)
      return
    }

    const { error: tErr } = await supabase.from('survey_targets').insert(
      selectedGcas.map(gid => ({ survey_id: survey.id, discipleship_id: gid }))
    )
    setSaving(false)
    if (tErr) { setError('Pesquisa criada, mas houve erro ao vincular os GCAs.'); return }

    setOpen(false)
    router.push(`/discipulados/pesquisas/${survey.id}`)
  }

  const input = "w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
  const label = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
      >
        <Plus className="h-4 w-4" /> Nova Pesquisa
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-base font-bold text-slate-900">Nova Pesquisa</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={save} className="p-5 space-y-5">
              <div>
                <label className={label}>Título *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Acompanhamento trimestral dos GCAs" className={input} required />
              </div>

              <div>
                <label className={label}>Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Explique o objetivo da pesquisa..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              {/* Público-alvo */}
              <div>
                <label className={label}>Quem vai responder? *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(AUDIENCE_META) as Audience[]).map(a => {
                    const m = AUDIENCE_META[a]
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAudience(a)}
                        className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all ${
                          audience === a ? 'border-violet-600 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className={`text-sm font-bold ${audience === a ? 'text-violet-900' : 'text-slate-700'}`}>{m.emoji} {m.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={allowAnonymous} onChange={e => setAllowAnonymous(e.target.checked)} className="h-4 w-4 accent-violet-600" />
                Permitir resposta anônima (sem identificar quem respondeu)
              </label>

              {/* Perguntas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={label + ' mb-0'}>Perguntas *</label>
                  <button type="button" onClick={addQuestion} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2.5">
                  {questions.map((q, i) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-slate-300 mt-2.5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <input
                            value={q.label}
                            onChange={e => updateQuestion(q.id, { label: e.target.value })}
                            placeholder={`Pergunta ${i + 1}`}
                            className={input}
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={q.type}
                              onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                              className="h-9 rounded-lg border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                              <input type="checkbox" checked={!!q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} className="h-3.5 w-3.5 accent-violet-600" />
                              Obrigatória
                            </label>
                          </div>
                          {q.type === 'opcoes' && (
                            <input
                              value={(q.options || []).join(', ')}
                              onChange={e => updateQuestion(q.id, { options: e.target.value.split(',') })}
                              placeholder="Opções separadas por vírgula: Ótimo, Bom, Regular, Ruim"
                              className={input}
                            />
                          )}
                        </div>
                        <button type="button" onClick={() => removeQuestion(q.id)} className="text-slate-300 hover:text-red-500 mt-2.5 flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GCAs vinculados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={label + ' mb-0'}>Vincular aos GCAs * <span className="text-slate-400 font-normal">({selectedGcas.length} de {gcas.length})</span></label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelectedGcas(gcas.map(g => g.id))} className="text-xs font-semibold text-violet-600 hover:text-violet-800">Todos</button>
                    <button type="button" onClick={() => setSelectedGcas([])} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Nenhum</button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-2">Cada GCA selecionado recebe um link exclusivo — as respostas ficam separadas por GCA.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {gcas.map(g => (
                    <label key={g.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      selectedGcas.includes(g.id) ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input type="checkbox" checked={selectedGcas.includes(g.id)} onChange={() => toggleGca(g.id)} className="h-3.5 w-3.5 accent-violet-600" />
                      <span className="truncate">{g.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : 'Criar Pesquisa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
