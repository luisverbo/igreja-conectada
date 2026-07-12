'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, X, MessageSquareText, Mic, Video, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  churchId: string
}

const DELAY_OPTIONS = [
  { value: 1, label: '1 hora depois' },
  { value: 6, label: '6 horas depois' },
  { value: 12, label: '12 horas depois' },
  { value: 24, label: '24 horas depois (1 dia)' },
  { value: 48, label: '2 dias depois' },
  { value: 72, label: '3 dias depois' },
  { value: 168, label: '7 dias depois' },
  { value: 336, label: '14 dias depois' },
  { value: 720, label: '30 dias depois' },
]

const TYPE_META = {
  texto: { icon: MessageSquareText, label: 'Texto', color: 'text-blue-600 bg-blue-50' },
  audio: { icon: Mic, label: 'Áudio', color: 'text-emerald-600 bg-emerald-50' },
  video: { icon: Video, label: 'Vídeo', color: 'text-violet-600 bg-violet-50' },
}

function delayLabel(hours: number) {
  const opt = DELAY_OPTIONS.find(o => o.value === hours)
  if (opt) return opt.label
  return hours >= 24 ? `${Math.round(hours / 24)} dia(s) depois` : `${hours}h depois`
}

export function FollowupRulesSection({ churchId }: Props) {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    delay_hours: '24',
    message_type: 'texto' as 'texto' | 'audio' | 'video',
    content: '',
    media_url: '',
  })

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('followup_rules')
      .select('*')
      .eq('church_id', churchId)
      .order('delay_hours')
    setRules(data || [])
    setLoading(false)
  }, [churchId])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (form.message_type !== 'texto' && !form.media_url.trim()) {
      setError('Informe o link do arquivo de áudio/vídeo.')
      return
    }
    if (form.message_type === 'texto' && !form.content.trim()) {
      setError('Escreva a mensagem.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('followup_rules').insert({
      church_id: churchId,
      trigger_event: 'aceitou_jesus',
      delay_hours: parseInt(form.delay_hours),
      message_type: form.message_type,
      content: form.content.trim() || null,
      media_url: form.media_url.trim() || null,
      active: true,
    })
    setSaving(false)
    if (insertError) {
      setError('Erro ao salvar: ' + insertError.message)
      return
    }
    setOpen(false)
    setForm({ delay_hours: '24', message_type: 'texto', content: '', media_url: '' })
    load()
  }

  async function toggleActive(rule: any) {
    const supabase = createClient()
    await supabase.from('followup_rules').update({ active: !rule.active }).eq('id', rule.id)
    load()
  }

  async function remove(id: string) {
    const supabase = createClient()
    await supabase.from('followup_rules').delete().eq('id', id)
    load()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          Quando alguém <strong>aceita Jesus</strong>, estas mensagens são enviadas automaticamente
          pelo WhatsApp no horário programado. Use <code className="bg-slate-100 px-1 rounded text-xs">{'{nome}'}</code> para
          incluir o primeiro nome da pessoa.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Nova
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-300" /></div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhuma mensagem automática configurada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const meta = TYPE_META[rule.message_type as keyof typeof TYPE_META] || TYPE_META.texto
            const Icon = meta.icon
            return (
              <div key={rule.id} className={`flex items-start gap-3 rounded-xl border p-3.5 ${rule.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {meta.label} · {delayLabel(rule.delay_hours)}
                  </p>
                  {rule.content && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{rule.content}</p>}
                  {rule.media_url && <p className="text-xs text-violet-500 truncate mt-0.5">{rule.media_url}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(rule)}
                    role="switch"
                    aria-checked={rule.active}
                    title={rule.active ? 'Desativar' : 'Ativar'}
                    className={`relative h-5 w-9 rounded-full transition-colors ${rule.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${rule.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => remove(rule.id)} title="Excluir" className="text-slate-300 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Nova Mensagem Automática</h2>
              <button onClick={() => { setOpen(false); setError(null) }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Enviar quando?</label>
                <select value={form.delay_hours} onChange={e => setForm(p => ({ ...p, delay_hours: e.target.value }))} className={inputClass}>
                  {DELAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} de aceitar Jesus</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Tipo de mensagem</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['texto', 'audio', 'video'] as const).map(t => {
                    const meta = TYPE_META[t]
                    const Icon = meta.icon
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, message_type: t }))}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-semibold transition-all ${
                          form.message_type === t
                            ? 'border-violet-600 bg-violet-50 text-violet-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {form.message_type !== 'texto' && (
                <div>
                  <label className={labelClass}>Link do arquivo ({form.message_type === 'audio' ? 'MP3/OGG' : 'MP4'}) *</label>
                  <input
                    type="url"
                    value={form.media_url}
                    onChange={e => setForm(p => ({ ...p, media_url: e.target.value }))}
                    placeholder="https://..."
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Hospede o arquivo em um link público (Supabase Storage, Google Drive público, etc.)
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  {form.message_type === 'texto' ? 'Mensagem *' : 'Legenda (opcional)'}
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={5}
                  placeholder={'Olá, {nome}! Que alegria ter você conosco...'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-slate-400 mt-1">{'{nome}'} será trocado pelo primeiro nome da pessoa.</p>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setOpen(false); setError(null) }} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
