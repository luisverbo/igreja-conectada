'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Search, Clock, Minus, Plus, Baby } from 'lucide-react'

export interface GcaOption {
  id: string
  name: string
  leaders: string | null
  neighborhood: string | null
  day: string | null
}

interface Props {
  /** Link fixo de um GCA */
  gcaToken?: string
  /** Link geral: a pessoa escolhe o GCA na lista */
  churchToken?: string
  gcas?: GcaOption[]
}

const empty = {
  full_name: '', phone: '', birth_date: '', gender: '',
  cep: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '',
  nm: '',
  rhema: '', marital_status: '', spouse_name: '', spouse_phone: '', spouse_in_gca: '',
}

interface Child { full_name: string; birth_date: string; gender: string }
const emptyChild: Child = { full_name: '', birth_date: '', gender: '' }
const MAX_CHILDREN = 10

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function GcaSignupForm({ gcaToken, churchToken, gcas = [] }: Props) {
  const picking = !gcaToken
  const [gcaId, setGcaId] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(empty)
  const [cepLoading, setCepLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ result: string; gcaName: string; spouseLinkedName?: string | null } | null>(null)
  const [hasKids, setHasKids] = useState<'' | 'sim' | 'nao'>('')
  const [kids, setKids] = useState<Child[]>([])

  function setKidsCount(n: number) {
    const count = Math.max(1, Math.min(MAX_CHILDREN, n))
    setKids(prev => Array.from({ length: count }, (_, i) => prev[i] || { ...emptyChild }))
  }
  function setKid(i: number, k: keyof Child, v: string) {
    setKids(prev => prev.map((c, j) => (j === i ? { ...c, [k]: v } : c)))
  }

  function set(k: keyof typeof empty, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function onCep(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    set('cep', digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(p => ({
          ...p,
          address: data.logradouro || p.address,
          neighborhood: data.bairro || p.neighborhood,
          city: data.localidade || p.city,
          state: data.uf || p.state,
        }))
      }
    } catch { /* a pessoa preenche na mão */ }
    setCepLoading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (picking && !gcaId) { setError('Escolha o seu GCA na lista.'); return }
    if (!form.nm) { setError('Responda se você já fez o curso de Novos Membros.'); return }
    if (!form.rhema) { setError('Responda se você é formado(a) no RHEMA.'); return }
    if (!form.marital_status) { setError('Informe seu estado civil.'); return }
    if (form.marital_status === 'casado') {
      if (!form.spouse_in_gca) { setError('Responda se seu cônjuge participa deste GCA.'); return }
      if (form.spouse_in_gca === 'mesmo_gca' && !form.spouse_name.trim()) { setError('Informe o nome do seu cônjuge.'); return }
    }
    if (!hasKids) { setError('Responda se você tem filhos.'); return }
    if (hasKids === 'sim') {
      const missing = kids.findIndex(k => !k.full_name.trim() || !k.birth_date || !k.gender)
      if (missing >= 0) { setError(`Preencha nome, data de nascimento e sexo do ${missing + 1}º filho.`); return }
    }
    setLoading(true)
    const res = await fetch('/api/cadastro-gca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, gcaToken, churchToken, discipleshipId: gcaId || undefined,
        children: hasKids === 'sim' ? kids : [],
      }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erro ao enviar. Tente novamente.'); return }
    setDone({ result: data.result, gcaName: data.gcaName, spouseLinkedName: data.spouseLinkedName })
  }

  if (done) {
    const pending = done.result === 'transferencia_solicitada'
    return (
      <div className="text-center py-6">
        {pending
          ? <Clock className="h-14 w-14 text-amber-500 mx-auto mb-3" />
          : <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />}
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {pending ? 'Recebemos seu cadastro!' : 'Cadastro feito! 🙌'}
        </h2>
        <p className="text-sm text-slate-600">
          {pending
            ? <>Você já estava em outro GCA. Seu pedido para fazer parte do <strong>{done.gcaName}</strong> foi enviado para a liderança aprovar.</>
            : done.result === 'ja_vinculado'
              ? <>Seus dados foram atualizados. Você já faz parte do <strong>{done.gcaName}</strong>.</>
              : <>Agora você faz parte do <strong>{done.gcaName}</strong> no nosso sistema. Que alegria ter você!</>}
        </p>
        {done.spouseLinkedName && (
          <p className="text-sm text-violet-700 mt-3">💍 Seu cadastro foi ligado ao de <strong>{done.spouseLinkedName}</strong>.</p>
        )}
      </div>
    )
  }

  const inputClass = 'w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

  const q = search.trim().toLowerCase()
  const filtered = q
    ? gcas.filter(g => [g.name, g.leaders, g.neighborhood].filter(Boolean).join(' ').toLowerCase().includes(q))
    : gcas

  return (
    <form onSubmit={submit} className="space-y-5">
      {picking && (
        <div>
          <label className={labelClass}>Qual é o seu GCA? *</label>
          {gcas.length > 6 && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Busque pelo nome do líder ou bairro"
                className={`${inputClass} pl-9`}
              />
            </div>
          )}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map(g => (
              <button
                type="button"
                key={g.id}
                onClick={() => setGcaId(g.id)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                  gcaId === g.id ? 'border-violet-600 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className={`text-sm font-bold ${gcaId === g.id ? 'text-violet-900' : 'text-slate-800'}`}>🏠 {g.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[g.leaders && `Líder(es): ${g.leaders}`, g.neighborhood, g.day].filter(Boolean).join(' · ')}
                </p>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhum GCA encontrado</p>}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Nome completo *</label>
        <input required value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputClass} autoComplete="name" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>WhatsApp *</label>
          <input required type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(21) 99999-9999" className={inputClass} autoComplete="tel" />
        </div>
        <div>
          <label className={labelClass}>Data de nascimento</label>
          <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Sexo</label>
        <div className="grid grid-cols-2 gap-2">
          {[['M', 'Masculino'], ['F', 'Feminino']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => set('gender', v)}
              className={`h-11 rounded-lg border-2 text-sm font-semibold ${form.gender === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* RHEMA */}
      <div>
        <label className={labelClass}>Você é formado(a) no RHEMA? *</label>
        <div className="grid grid-cols-2 gap-2">
          {[['sim', 'Sim'], ['nao', 'Não']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => set('rhema', v)}
              className={`h-11 rounded-lg border-2 text-sm font-semibold ${form.rhema === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Estado civil + cônjuge */}
      <div>
        <label className={labelClass}>Estado civil *</label>
        <div className="grid grid-cols-2 gap-2">
          {[['solteiro', 'Solteiro(a)'], ['casado', 'Casado(a)'], ['divorciado', 'Divorciado(a)'], ['viuvo', 'Viúvo(a)']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => set('marital_status', v)}
              className={`h-11 rounded-lg border-2 text-sm font-semibold ${form.marital_status === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {form.marital_status === 'casado' && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
          <div>
            <label className={labelClass}>💍 Seu cônjuge participa deste GCA? *</label>
            <div className="grid grid-cols-2 gap-2">
              {[['mesmo_gca', 'Sim'], ['nao_participa', 'Não']].map(([v, l]) => (
                <button type="button" key={v} onClick={() => set('spouse_in_gca', v)}
                  className={`h-11 rounded-lg border-2 text-sm font-semibold ${form.spouse_in_gca === v ? 'border-violet-600 bg-white text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Nome e telefone só quando participa — servem para ligar os dois cadastros */}
          {form.spouse_in_gca === 'mesmo_gca' && (
            <>
              <div>
                <label className={labelClass}>Nome completo do cônjuge *</label>
                <input value={form.spouse_name} onChange={e => set('spouse_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>WhatsApp do cônjuge <span className="text-slate-400 font-normal">(ajuda a ligar os dois cadastros)</span></label>
                <input type="tel" inputMode="tel" value={form.spouse_phone} onChange={e => set('spouse_phone', maskPhone(e.target.value))} placeholder="(21) 99999-9999" className={inputClass} />
              </div>
              <p className="text-xs text-violet-700">👉 Peça para seu cônjuge também preencher este link — o sistema liga os dois cadastros sozinho.</p>
            </>
          )}
        </div>
      )}

      {/* Filhos */}
      <div>
        <label className={labelClass}>Você tem filhos? *</label>
        <div className="grid grid-cols-2 gap-2">
          {([['sim', 'Sim'], ['nao', 'Não']] as const).map(([v, l]) => (
            <button type="button" key={v}
              onClick={() => { setHasKids(v); if (v === 'sim' && kids.length === 0) setKids([{ ...emptyChild }]) }}
              className={`h-11 rounded-lg border-2 text-sm font-semibold ${hasKids === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {hasKids === 'sim' && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Baby className="h-4 w-4 text-violet-600" /> Quantos filhos?</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setKidsCount(kids.length - 1)} disabled={kids.length <= 1}
                aria-label="Menos um filho"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-lg font-bold text-slate-900">{kids.length}</span>
              <button type="button" onClick={() => setKidsCount(kids.length + 1)} disabled={kids.length >= MAX_CHILDREN}
                aria-label="Mais um filho"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {kids.map((k, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{i + 1}º filho</p>
              <div>
                <label className={labelClass}>Nome *</label>
                <input value={k.full_name} onChange={e => setKid(i, 'full_name', e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data de nascimento *</label>
                  <input type="date" value={k.birth_date} onChange={e => setKid(i, 'birth_date', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Sexo *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[['M', 'Masculino'], ['F', 'Feminino']].map(([v, l]) => (
                      <button type="button" key={v} onClick={() => setKid(i, 'gender', v)}
                        className={`h-11 rounded-lg border-2 text-xs font-semibold ${k.gender === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">📍 Onde você mora</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>CEP</label>
            <div className="relative">
              <input inputMode="numeric" value={form.cep} onChange={e => onCep(e.target.value)} placeholder="00000-000" className={inputClass} />
              {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-violet-500" />}
            </div>
          </div>
          <div>
            <label className={labelClass}>Número</label>
            <input value={form.number} onChange={e => set('number', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Rua</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} autoComplete="address-line1" />
        </div>
        <div>
          <label className={labelClass}>Complemento</label>
          <input value={form.complement} onChange={e => set('complement', e.target.value)} placeholder="Apto, bloco, casa..." className={inputClass} />
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Bairro</label>
            <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Cidade</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>UF</label>
            <input maxLength={2} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} className={inputClass} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Você já fez o curso de Novos Membros? *</label>
        <div className="grid grid-cols-3 gap-2">
          {[['sim', 'Sim, já fiz'], ['fazendo', 'Estou fazendo'], ['nao', 'Ainda não']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => set('nm', v)}
              className={`min-h-11 px-2 py-2 rounded-lg border-2 text-xs sm:text-sm font-semibold ${form.nm === v ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full h-12 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        Enviar cadastro
      </button>
      <p className="text-[11px] text-slate-400 text-center">Seus dados ficam guardados com a liderança da igreja e são usados só para o cuidado pastoral.</p>
    </form>
  )
}
