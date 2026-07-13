'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Plus, Trash2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  EDUCATION_LEVELS, MARITAL_STATUS, UF_LIST, PHONE_OPERATORS,
  COURSE_STATUS, SIM_NAO, BATISMO_COMO,
} from '@/lib/student-form-fields'

interface Props {
  token: string
  churchName: string
  turmaName: string
  filledBy?: string | null   // volunteer id when a logged-in user fills for someone
  volunteerName?: string | null
}

const ESTATUTO_URL = '/docs/estatuto-verbo-da-vida.pdf'

export function FichaForm({ token, churchName, turmaName, filledBy, volunteerName }: Props) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)

  const [form, setForm] = useState<any>({
    full_name: '', gender: 'M', education_level: EDUCATION_LEVELS[0], formation: '',
    is_entrepreneur: false, profession: '',
    address_type: 'nacional', has_cpf: true, cpf: '', rg: '', rg_ssp: '',
    naturalidade: '', nacionalidade: 'BRASILEIRA', birth_date: '', marital_status: MARITAL_STATUS[0],
    spouse_name: '', marriage_date: '',
    cep: '', address: '', city: '', neighborhood: '', sub_neighborhood: '', state: 'AC', country: 'BRASIL', number: '', complement: '',
    phone1: '', phone1_op: 'OI', phone1_whatsapp: false,
    phone2: '', phone2_op: 'OI', phone2_whatsapp: false,
    email: '',
    rhema: 'ainda_nao_fez', emr: 'ainda_nao_fez', ermm: 'ainda_nao_fez',
    novo_nascimento: '', batismo_espirito_santo: 'nao', batismo_aguas: 'sim', batismo_aguas_como: '',
    facebook: '', instagram: '', observacoes: '',
    photo_url: '',
    dependents: [{ name: '', birth_date: '' }],
    estatuto_accepted: false,
  })

  function set(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })) }

  async function handleCep(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    set('cep', digits)
    if (digits.length === 8) {
      setCepLoading(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setForm((p: any) => ({
            ...p,
            address: data.logradouro || p.address,
            neighborhood: data.bairro || p.neighborhood,
            city: data.localidade || p.city,
            state: data.uf || p.state,
          }))
        }
      } catch { /* ignore */ }
      setCepLoading(false)
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${token}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('student-photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('student-photos').getPublicUrl(path)
      set('photo_url', data.publicUrl)
    } catch {
      setError('Não foi possível enviar a foto. Você pode continuar sem ela.')
    }
    setUploading(false)
  }

  function addDependent() {
    set('dependents', [...form.dependents, { name: '', birth_date: '' }])
  }
  function removeDependent(i: number) {
    set('dependents', form.dependents.filter((_: any, idx: number) => idx !== i))
  }
  function setDependent(i: number, k: string, v: string) {
    const next = [...form.dependents]
    next[i] = { ...next[i], [k]: v }
    set('dependents', next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.estatuto_accepted) {
      setError('Você precisa ler e aceitar o estatuto para continuar.')
      return
    }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/ficha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, filledBy: filledBy || null, form }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Erro ao enviar. Tente novamente.'); return }
    setSuccess(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h3 className="text-xl font-bold text-slate-900">Ficha enviada!</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Obrigado, <strong>{form.full_name}</strong>! Seus dados foram registrados na turma
          <strong> {turmaName}</strong>. A equipe já pode ver sua ficha. 💜
        </p>
        {filledBy && (
          <button
            onClick={() => { setSuccess(false); setForm((p: any) => ({ ...p, full_name: '', cpf: '', phone1: '', email: '', estatuto_accepted: false })) }}
            className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Preencher outra ficha
          </button>
        )}
      </div>
    )
  }

  const input = "w-full h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const label = "block text-sm font-medium text-slate-600 mb-1"
  const section = "text-sm font-bold text-violet-700 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4"

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {filledBy && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          👤 Você está preenchendo <strong>por outra pessoa</strong> (voluntário: {volunteerName}). Use apenas para quem não sabe ou não tem meios de preencher.
        </div>
      )}

      {/* FOTO + DADOS PESSOAIS */}
      <div>
        <p className={section}>Dados Pessoais</p>
        <div className="space-y-4">
          <div>
            <label className={label}>Foto <span className="text-slate-400 font-normal">(opcional)</span></label>
            <div className="flex items-center gap-4">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Foto" className="h-20 w-20 rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs text-center">Sem foto</div>
              )}
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Enviando...' : 'Enviar foto'}
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <div>
            <label className={label}>Nome completo *</label>
            <input required value={form.full_name} onChange={e => set('full_name', e.target.value)} className={input} />
          </div>

          <div>
            <label className={label}>Sexo *</label>
            <div className="flex gap-4">
              {[{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Feminino' }].map(o => (
                <label key={o.v} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="radio" name="gender" checked={form.gender === o.v} onChange={() => set('gender', o.v)} className="accent-violet-600" />
                  {o.l}
                </label>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Grau de instrução</label>
              <select value={form.education_level} onChange={e => set('education_level', e.target.value)} className={input}>
                {EDUCATION_LEVELS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Formação</label>
              <input value={form.formation} onChange={e => set('formation', e.target.value)} className={input} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.is_entrepreneur} onChange={e => set('is_entrepreneur', e.target.checked)} className="h-4 w-4 accent-violet-600" />
            É empresário
          </label>

          <div>
            <label className={label}>Profissão</label>
            <input value={form.profession} onChange={e => set('profession', e.target.value)} className={input} />
          </div>
        </div>
      </div>

      {/* DOCUMENTOS E ENDEREÇO */}
      <div>
        <p className={section}>Documentos e Endereço</p>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Tipo de endereço</label>
              <div className="flex gap-4">
                {[{ v: 'nacional', l: 'Nacional' }, { v: 'internacional', l: 'Internacional' }].map(o => (
                  <label key={o.v} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="addr" checked={form.address_type === o.v} onChange={() => set('address_type', o.v)} className="accent-violet-600" />
                    {o.l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>CPF</label>
              <div className="flex gap-4 mb-2">
                {[{ v: true, l: 'Tem CPF' }, { v: false, l: 'Não tem' }].map(o => (
                  <label key={String(o.v)} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="hascpf" checked={form.has_cpf === o.v} onChange={() => set('has_cpf', o.v)} className="accent-violet-600" />
                    {o.l}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {form.has_cpf && (
            <div>
              <label className={label}>CPF</label>
              <input value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" className={input} />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>RG</label>
              <input value={form.rg} onChange={e => set('rg', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Órgão emissor (SSP)</label>
              <input value={form.rg_ssp} onChange={e => set('rg_ssp', e.target.value)} className={input} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Naturalidade</label>
              <input value={form.naturalidade} onChange={e => set('naturalidade', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Nacionalidade</label>
              <input value={form.nacionalidade} onChange={e => set('nacionalidade', e.target.value)} className={input} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Data de nascimento</label>
              <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Estado civil</label>
              <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)} className={input}>
                {MARITAL_STATUS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>

          {form.marital_status === 'CASADO (A)' && (
            <div className="grid sm:grid-cols-2 gap-4 rounded-xl bg-violet-50 border border-violet-100 p-4">
              <div>
                <label className={label}>Nome do cônjuge</label>
                <input value={form.spouse_name} onChange={e => set('spouse_name', e.target.value)} placeholder="Nome completo do cônjuge" className={input} />
              </div>
              <div>
                <label className={label}>Data do casamento</label>
                <input type="date" value={form.marriage_date} onChange={e => set('marriage_date', e.target.value)} className={input} />
              </div>
            </div>
          )}

          <div className="relative">
            <label className={label}>CEP</label>
            <input value={form.cep} onChange={e => handleCep(e.target.value)} placeholder="00000-000" maxLength={9} className={input} />
            {cepLoading && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-violet-500" />}
          </div>

          <div>
            <label className={label}>Endereço</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} className={input} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Cidade</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Bairro</label>
              <input value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} className={input} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={label}>Sub bairro</label>
              <input value={form.sub_neighborhood} onChange={e => set('sub_neighborhood', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Estado</label>
              <select value={form.state} onChange={e => set('state', e.target.value)} className={input}>
                {UF_LIST.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Número</label>
              <input value={form.number} onChange={e => set('number', e.target.value)} className={input} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>País</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Complemento</label>
              <input value={form.complement} onChange={e => set('complement', e.target.value)} className={input} />
            </div>
          </div>
        </div>
      </div>

      {/* CONTATO */}
      <div>
        <p className={section}>Contato</p>
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <div>
                <label className={label}>Telefone {String(n).padStart(2, '0')}</label>
                <input value={form[`phone${n}`]} onChange={e => set(`phone${n}`, e.target.value)} placeholder="(00) 00000-0000" className={input} />
              </div>
              <div>
                <label className={label}>Operadora</label>
                <select value={form[`phone${n}_op`]} onChange={e => set(`phone${n}_op`, e.target.value)} className={`${input} w-28`}>
                  {PHONE_OPERATORS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer h-11">
                <input type="checkbox" checked={form[`phone${n}_whatsapp`]} onChange={e => set(`phone${n}_whatsapp`, e.target.checked)} className="h-4 w-4 accent-green-600" />
                WhatsApp
              </label>
            </div>
          ))}
          <div>
            <label className={label}>E-mail</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Facebook</label>
            <input value={form.facebook} onChange={e => set('facebook', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Instagram</label>
            <input value={form.instagram} onChange={e => set('instagram', e.target.value)} className={input} />
          </div>
        </div>
      </div>

      {/* DEPENDENTES */}
      <div>
        <p className={section}>Dependentes</p>
        <div className="space-y-3">
          {form.dependents.map((d: any, i: number) => (
            <div key={i} className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <div>
                <label className={label}>Nome do dependente</label>
                <input value={d.name} onChange={e => setDependent(i, 'name', e.target.value)} placeholder="Nome" className={input} />
              </div>
              <div>
                <label className={label}>Nascimento</label>
                <input type="date" value={d.birth_date} onChange={e => setDependent(i, 'birth_date', e.target.value)} className={input} />
              </div>
              <button type="button" onClick={() => removeDependent(i)} className="h-11 px-3 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addDependent} className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            <Plus className="h-4 w-4" /> Novo Dependente
          </button>
        </div>
      </div>

      {/* VIDA ESPIRITUAL */}
      <div>
        <p className={section}>Vida Espiritual</p>
        <div className="space-y-4">
          {[
            { k: 'rhema', l: 'RHEMA' }, { k: 'emr', l: 'EMR' }, { k: 'ermm', l: 'ERMM' },
          ].map(c => (
            <div key={c.k}>
              <label className={label}>{c.l}</label>
              <select value={form[c.k]} onChange={e => set(c.k, e.target.value)} className={input}>
                {COURSE_STATUS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className={label}>Novo Nascimento (data)</label>
            <input type="date" value={form.novo_nascimento} onChange={e => set('novo_nascimento', e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Já recebeu o Batismo no Espírito Santo?</label>
            <select value={form.batismo_espirito_santo} onChange={e => set('batismo_espirito_santo', e.target.value)} className={input}>
              {SIM_NAO.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Batismo nas águas</label>
              <select value={form.batismo_aguas} onChange={e => set('batismo_aguas', e.target.value)} className={input}>
                {SIM_NAO.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>
            {form.batismo_aguas === 'sim' && (
              <div>
                <label className={label}>Como foi?</label>
                <select value={form.batismo_aguas_como} onChange={e => set('batismo_aguas_como', e.target.value)} className={input}>
                  <option value="">Selecione</option>
                  {BATISMO_COMO.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className={label}>Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
      </div>

      {/* ESTATUTO */}
      <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.estatuto_accepted}
            onChange={e => set('estatuto_accepted', e.target.checked)}
            className="h-5 w-5 accent-violet-600 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm text-slate-700">
            Li o estatuto da <strong>Igreja Evangélica Verbo da Vida</strong> e concordo com os seus termos.{' '}
            <a href={ESTATUTO_URL} target="_blank" rel="noopener noreferrer" className="text-violet-700 font-semibold underline">
              Clique aqui para ler o estatuto (PDF)
            </a>.
          </span>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !form.estatuto_accepted}
        className="w-full h-12 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-violet-700 transition-colors"
      >
        {loading ? <><Loader2 className="h-5 w-5 animate-spin" />Enviando...</> : 'Enviar Ficha'}
      </button>
    </form>
  )
}
