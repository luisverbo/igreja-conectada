'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, X, UserCheck, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  churchId: string
}

const AGE_PRESETS = [
  { value: '', label: 'Qualquer idade', min: null, max: null },
  { value: 'jovem', label: 'Jovem (12 a 25 anos)', min: 12, max: 25 },
  { value: 'adulto', label: 'Adulto (26 anos ou mais)', min: 26, max: null },
  { value: 'custom', label: 'Personalizado', min: null, max: null },
]

function ruleDescription(rule: any) {
  const parts: string[] = []
  if (rule.gender === 'M') parts.push('Homem')
  else if (rule.gender === 'F') parts.push('Mulher')
  else parts.push('Qualquer pessoa')

  if (rule.age_min != null && rule.age_max != null) parts.push(`${rule.age_min} a ${rule.age_max} anos`)
  else if (rule.age_min != null) parts.push(`${rule.age_min}+ anos`)
  else if (rule.age_max != null) parts.push(`até ${rule.age_max} anos`)

  return parts.join(' · ')
}

export function CareRulesSection({ churchId }: Props) {
  const [rules, setRules] = useState<any[]>([])
  const [team, setTeam] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    gender: '',
    agePreset: '',
    age_min: '',
    age_max: '',
    assigned_to: '',
  })

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: rulesData }, { data: teamData }] = await Promise.all([
      supabase
        .from('care_rules')
        .select('*, profiles:assigned_to(full_name)')
        .eq('church_id', churchId)
        .order('priority'),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('church_id', churchId)
        .eq('is_active', true)
        .order('full_name'),
    ])
    setRules(rulesData || [])
    setTeam(teamData || [])
    setLoading(false)
  }, [churchId])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.assigned_to) { setError('Escolha o responsável.'); return }
    setSaving(true)
    setError(null)

    const preset = AGE_PRESETS.find(p => p.value === form.agePreset)
    const ageMin = form.agePreset === 'custom' ? (form.age_min ? parseInt(form.age_min) : null) : preset?.min ?? null
    const ageMax = form.agePreset === 'custom' ? (form.age_max ? parseInt(form.age_max) : null) : preset?.max ?? null

    const supabase = createClient()
    const { error: insertError } = await supabase.from('care_rules').insert({
      church_id: churchId,
      gender: form.gender || null,
      age_min: ageMin,
      age_max: ageMax,
      assigned_to: form.assigned_to,
      active: true,
      priority: rules.length,
    })
    setSaving(false)
    if (insertError) {
      setError('Erro ao salvar: ' + insertError.message)
      return
    }
    setOpen(false)
    setForm({ gender: '', agePreset: '', age_min: '', age_max: '', assigned_to: '' })
    load()
  }

  async function toggleActive(rule: any) {
    const supabase = createClient()
    await supabase.from('care_rules').update({ active: !rule.active }).eq('id', rule.id)
    load()
  }

  async function remove(id: string) {
    const supabase = createClient()
    await supabase.from('care_rules').delete().eq('id', id)
    load()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          Quando alguém aceita Jesus, o sistema encaminha automaticamente para o responsável
          conforme o perfil (a <strong>primeira regra</strong> que combinar é aplicada). O responsável
          recebe um aviso no WhatsApp. Sem regras = sem encaminhamento.
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
          <UserCheck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhuma regra de encaminhamento configurada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className={`flex items-center gap-3 rounded-xl border p-3.5 ${rule.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap text-sm">
                <span className="font-medium text-slate-700">{ruleDescription(rule)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                <span className="font-bold text-violet-700">{(rule.profiles as any)?.full_name || '—'}</span>
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
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Nova Regra de Encaminhamento</h2>
              <button onClick={() => { setOpen(false); setError(null) }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Sexo</label>
                <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className={inputClass}>
                  <option value="">Qualquer</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Faixa etária</label>
                <select value={form.agePreset} onChange={e => setForm(p => ({ ...p, agePreset: e.target.value }))} className={inputClass}>
                  {AGE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {form.agePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Idade mínima</label>
                    <input type="number" min={0} value={form.age_min} onChange={e => setForm(p => ({ ...p, age_min: e.target.value }))} placeholder="Ex: 12" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Idade máxima</label>
                    <input type="number" min={0} value={form.age_max} onChange={e => setForm(p => ({ ...p, age_max: e.target.value }))} placeholder="Ex: 25" className={inputClass} />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Encaminhar para *</label>
                <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className={inputClass} required>
                  <option value="">Selecione o responsável</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-1">O responsável recebe um aviso no WhatsApp com os dados da pessoa.</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

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
