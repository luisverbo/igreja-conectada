'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, CheckCircle, UserPlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  churchId: string
  userId: string
  userName: string
}

interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export function CounselorNewConvert({ churchId, userId, userName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    birth_date: '',
    cep: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    origin: '' as 'aceitou_jesus_aqui' | 'veio_de_outra_igreja' | '',
    gender: '' as 'M' | 'F' | 'outro' | '',
  })
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleCepChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    set('cep', digits)

    if (digits.length === 8) {
      setCepLoading(true)
      setCoords(null)
      try {
        const [viaCepRes, nominatimRes] = await Promise.allSettled([
          fetch(`https://viacep.com.br/ws/${digits}/json/`),
          fetch(`https://nominatim.openstreetmap.org/search?q=${digits}+Brasil&format=json&limit=1`, {
            headers: { 'User-Agent': 'IgrejaConectada/1.0' },
          }),
        ])

        if (viaCepRes.status === 'fulfilled') {
          const data: CepData = await viaCepRes.value.json()
          if (!data.erro) {
            setForm(p => ({
              ...p,
              address: data.logradouro || p.address,
              neighborhood: data.bairro || p.neighborhood,
              city: data.localidade || p.city,
              state: data.uf || p.state,
            }))
          }
        }

        if (nominatimRes.status === 'fulfilled') {
          const geoData = await nominatimRes.value.json()
          if (Array.isArray(geoData) && geoData.length > 0) {
            setCoords({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) })
          }
        }
      } catch {
        // silently ignore geocoding errors
      } finally {
        setCepLoading(false)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    const { data: person, error: personError } = await supabase
      .from('people')
      .insert({
        church_id: churchId,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        birth_date: form.birth_date || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        origin: form.origin || null,
        gender: form.gender || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        accepted_jesus_at: new Date().toISOString().split('T')[0],
        status: 'novo',
        can_serve: false,
        created_by: userId,
      })
      .select()
      .single()

    if (personError || !person) {
      setError('Erro ao cadastrar. Tente novamente.')
      setLoading(false)
      return
    }

    await supabase.from('journey_events').insert([
      { person_id: person.id, event_type: 'cadastrado', recorded_by: userId },
      { person_id: person.id, event_type: 'aceitou_jesus', recorded_by: userId },
    ])

    setSuccess(form.full_name.trim())
    setForm({ full_name: '', phone: '', birth_date: '', cep: '', address: '', neighborhood: '', city: '', state: '', origin: '', gender: '' })
    setCoords(null)
    setLoading(false)
    router.refresh()
  }

  const inputClass = "w-full h-14 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Novo Convertido</h1>
          <p className="text-sm text-slate-500">Preencha os dados abaixo</p>
        </div>
      </div>

      {/* Feedback de sucesso */}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800">{success} cadastrado(a)!</p>
            <p className="text-sm text-emerald-600 mt-0.5">Pode cadastrar o próximo.</p>
          </div>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Nome Completo <span className="text-violet-600">*</span>
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Nome do convertido"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Telefone / WhatsApp <span className="text-violet-600">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="(11) 99999-9999"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Data de Nascimento <span className="text-violet-600">*</span>
          </label>
          <input
            type="date"
            value={form.birth_date}
            onChange={e => set('birth_date', e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            CEP <span className="text-violet-600">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={form.cep}
              onChange={e => handleCepChange(e.target.value)}
              placeholder="00000-000"
              required
              maxLength={8}
              className={`${inputClass} pr-12`}
            />
            {cepLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
              </div>
            )}
          </div>
          {coords && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <span>✓</span> Localização obtida com sucesso
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Endereço <span className="text-slate-400 font-normal text-xs">(preenchido pelo CEP)</span>
          </label>
          <input
            type="text"
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="Rua, número..."
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Bairro <span className="text-slate-400 font-normal text-xs">(preenchido pelo CEP)</span>
          </label>
          <input
            type="text"
            value={form.neighborhood}
            onChange={e => set('neighborhood', e.target.value)}
            placeholder="Bairro"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Cidade <span className="text-slate-400 font-normal text-xs">(CEP)</span>
            </label>
            <input
              type="text"
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="Cidade"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              Estado <span className="text-slate-400 font-normal text-xs">(CEP)</span>
            </label>
            <input
              type="text"
              value={form.state}
              onChange={e => set('state', e.target.value)}
              placeholder="UF"
              maxLength={2}
              className={inputClass}
            />
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Sexo <span className="text-violet-600">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[{ v: 'M', label: '♂ Masculino' }, { v: 'F', label: '♀ Feminino' }, { v: 'outro', label: '— Outro' }].map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => set('gender', opt.v)}
                className={`h-14 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.98] ${
                  form.gender === opt.v
                    ? 'border-violet-600 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Origin */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Como chegou? <span className="text-violet-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => set('origin', 'aceitou_jesus_aqui')}
              className={`h-14 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.98] ${
                form.origin === 'aceitou_jesus_aqui'
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              ✝️ Aceitou Jesus aqui
            </button>
            <button
              type="button"
              onClick={() => set('origin', 'veio_de_outra_igreja')}
              className={`h-14 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.98] ${
                form.origin === 'veio_de_outra_igreja'
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              🏛️ Outra igreja
            </button>
          </div>
          {/* Hidden required input for form validation */}
          <input
            type="text"
            required
            value={form.origin}
            onChange={() => {}}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !form.origin}
          className="w-full h-14 rounded-xl bg-violet-600 text-white text-base font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <span className="opacity-70">Cadastrando...</span>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Cadastrar Convertido
            </>
          )}
        </button>
      </form>
    </div>
  )
}
