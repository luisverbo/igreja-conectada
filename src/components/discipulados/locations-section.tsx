'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamicImport from 'next/dynamic'
import { Plus, Trash2, Loader2, X, MapPin, Church, HomeIcon, Pencil, ExternalLink, Search, Check, AlertTriangle, Crosshair } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MapPicker = dynamicImport(
  () => import('./map-picker').then(mod => mod.MapPicker),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-100"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div> }
)

interface Props {
  churchId: string
  canEdit: boolean
}

export function LocationsSection({ churchId, canEdit }: Props) {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    location_type: 'casa',
    host_name: '',
    host_phone: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
  })

  // Conferência do endereço antes de salvar
  type Verify =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'found'; label: string; lat: number; lng: number }
    | { status: 'notfound' }
    | { status: 'confirmed'; label: string; lat: number; lng: number }
  const [verify, setVerify] = useState<Verify>({ status: 'idle' })
  // Mapa de ajuste fino: mapKey força recentrar quando o "Localizar" acha novas coordenadas
  const [showMap, setShowMap] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  const ADDRESS_FIELDS = ['address', 'neighborhood', 'city', 'state']

  function set(k: string, v: string) {
    setForm(p => ({ ...p, [k]: v }))
    // Mexeu no endereço? A conferência anterior não vale mais (e o pino sai do mapa).
    if (ADDRESS_FIELDS.includes(k)) {
      if (verify.status !== 'idle') setMapKey(key => key + 1)
      setVerify({ status: 'idle' })
    }
  }

  function addressQuery() {
    return [form.address, form.neighborhood, form.city, form.state, 'Brasil']
      .map(s => (s || '').trim())
      .filter(Boolean)
      .join(', ')
  }

  const canVerify = !!form.address.trim() && !!form.city.trim()

  /** Link do Google Maps: usa as coordenadas quando já conferidas, senão busca pelo texto. */
  function mapsUrl() {
    const v = verify.status === 'found' || verify.status === 'confirmed' ? verify : null
    const query = v ? `${v.lat},${v.lng}` : addressQuery()
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }

  async function geocode(): Promise<{ found: boolean; precise?: boolean; label?: string; lat?: number; lng?: number }> {
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: form.address,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
        }),
      })
      if (!res.ok) return { found: false }
      return await res.json()
    } catch {
      return { found: false }
    }
  }

  async function runVerify() {
    if (!canVerify) return
    setVerify({ status: 'loading' })
    const geo = await geocode()
    if (geo.found && geo.lat != null && geo.lng != null) {
      setVerify({ status: 'found', label: geo.label || addressQuery(), lat: geo.lat, lng: geo.lng })
      setMapKey(k => k + 1) // recentra o mapa na nova posição
    } else {
      setVerify({ status: 'notfound' })
    }
  }

  /** Pino colocado/arrastado pelo usuário — vale mais que qualquer busca. */
  function pickOnMap(lat: number, lng: number) {
    setVerify({ status: 'confirmed', label: 'Posição marcada por você no mapa', lat, lng })
  }

  const emptyForm = {
    name: '', location_type: 'casa', host_name: '', host_phone: '',
    address: '', neighborhood: '', city: '', state: '', notes: '',
  }

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setVerify({ status: 'idle' })
    setShowMap(false)
    setOpen(true)
  }

  function openEdit(loc: any) {
    setEditingId(loc.id)
    setForm({
      name: loc.name || '',
      location_type: loc.location_type || 'casa',
      host_name: loc.host_name || '',
      host_phone: loc.host_phone || '',
      address: loc.address || '',
      neighborhood: loc.neighborhood || '',
      city: loc.city || '',
      state: loc.state || '',
      notes: loc.notes || '',
    })
    setError(null)
    setVerify(
      loc.latitude != null && loc.longitude != null
        ? { status: 'confirmed', label: 'Coordenadas já salvas neste local', lat: loc.latitude, lng: loc.longitude }
        : { status: 'idle' }
    )
    setShowMap(false)
    setMapKey(k => k + 1)
    setOpen(true)
  }

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('gca_locations')
      .select('*')
      .eq('church_id', churchId)
      .order('name')
    setLocations(data || [])
    setLoading(false)
  }, [churchId])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const current = editingId ? locations.find(l => l.id === editingId) : null
    const addressChanged = !current
      || (current.address || '') !== form.address
      || (current.city || '') !== form.city
      || (current.neighborhood || '') !== form.neighborhood

    // Se o usuário já conferiu o endereço no mapa, usamos aquelas coordenadas.
    let latitude: number | null = null
    let longitude: number | null = null
    const checked = verify.status === 'found' || verify.status === 'confirmed' ? verify : null
    if (checked) {
      latitude = checked.lat
      longitude = checked.lng
    } else if (addressChanged && form.address && form.city) {
      const geo = await geocode()
      if (geo.found && geo.lat != null && geo.lng != null) {
        latitude = geo.lat
        longitude = geo.lng
      }
    }

    const supabase = createClient()
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      location_type: form.location_type,
      host_name: form.location_type === 'casa' ? form.host_name.trim() || null : null,
      host_phone: form.location_type === 'casa' ? form.host_phone.trim() || null : null,
      address: form.address.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      notes: form.notes.trim() || null,
      ...(addressChanged || latitude != null ? { latitude, longitude } : {}),
    }

    const { error: saveError } = editingId
      ? await supabase.from('gca_locations').update(payload).eq('id', editingId)
      : await supabase.from('gca_locations').insert({ ...payload, church_id: churchId, active: true })

    setSaving(false)
    if (saveError) {
      setError('Erro ao salvar: ' + saveError.message)
      return
    }

    // Mantém o endereço dos GCAs deste local em sincronia (usado no mapa
    // e no cálculo do GCA mais próximo)
    if (editingId) {
      await supabase.from('discipleships').update({
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        ...(addressChanged || latitude != null ? { latitude, longitude } : {}),
      }).eq('location_id', editingId)
    }

    setOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    load()
  }

  async function remove(id: string) {
    const supabase = createClient()
    const { error: delError } = await supabase.from('gca_locations').delete().eq('id', id)
    if (delError) {
      // Location in use by a GCA — deactivate instead
      await supabase.from('gca_locations').update({ active: false }).eq('id', id)
    }
    load()
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-900">Locais dos GCAs</h3>
          {locations.length > 0 && (
            <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-bold">{locations.length}</span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Novo Local
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Casas que cedem espaço (com anfitriões) ou a própria igreja. Ao criar um GCA você escolhe o local.
      </p>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-300" /></div>
      ) : locations.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Nenhum local cadastrado ainda</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {locations.map(loc => (
            <div key={loc.id} className={`rounded-xl border p-3.5 ${loc.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${loc.location_type === 'igreja' ? 'bg-violet-50 text-violet-600' : 'bg-amber-50 text-amber-600'}`}>
                    {loc.location_type === 'igreja' ? <Church className="h-4 w-4" /> : <HomeIcon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{loc.name}</p>
                    <p className="text-[11px] text-slate-400">{loc.location_type === 'igreja' ? 'Igreja' : 'Casa'}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(loc)} title="Editar local" className="text-slate-300 hover:text-violet-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(loc.id)} title="Excluir local" className="text-slate-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {loc.host_name && (
                <p className="text-xs text-slate-600 mt-2">
                  🏠 Anfitrião: <strong>{loc.host_name}</strong>
                  {loc.host_phone && <span className="text-slate-400"> · {loc.host_phone}</span>}
                </p>
              )}
              {(loc.address || loc.neighborhood) && (
                <p className="text-xs text-slate-400 mt-1 truncate">
                  📍 {[loc.address, loc.neighborhood, loc.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">{editingId ? 'Editar Local' : 'Novo Local de GCA'}</h2>
              <button onClick={() => { setOpen(false); setEditingId(null); setError(null) }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Tipo de local</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => set('location_type', 'casa')}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                      form.location_type === 'casa' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <HomeIcon className="h-4 w-4" /> Casa
                  </button>
                  <button
                    type="button"
                    onClick={() => set('location_type', 'igreja')}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                      form.location_type === 'igreja' ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <Church className="h-4 w-4" /> Igreja
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>Nome do local *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder={form.location_type === 'casa' ? 'Ex: Casa da Família Silva' : 'Ex: Igreja — Salão 2'}
                  className={inputClass}
                />
              </div>

              {form.location_type === 'casa' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Anfitrião(s)</label>
                    <input type="text" value={form.host_name} onChange={e => set('host_name', e.target.value)} placeholder="Ex: João e Maria Silva" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Telefone do anfitrião</label>
                    <input type="tel" value={form.host_phone} onChange={e => set('host_phone', e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Endereço</label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número" className={inputClass} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input type="text" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>UF</label>
                  <input type="text" maxLength={2} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} className={inputClass} />
                </div>
              </div>

              {/* Conferir o endereço antes de salvar — é ele que posiciona
                  o GCA no mapa e define o "GCA mais próximo" */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-violet-600" /> Conferir endereço
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={runVerify}
                      disabled={!canVerify || verify.status === 'loading'}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
                    >
                      {verify.status === 'loading'
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Search className="h-3.5 w-3.5" />}
                      Localizar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const opening = !showMap
                        setShowMap(opening)
                        // Sem coordenadas ainda? Tenta ao menos centrar na região
                        if (opening && verify.status !== 'found' && verify.status !== 'confirmed' && canVerify) runVerify()
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        showMap ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                      }`}
                    >
                      <Crosshair className="h-3.5 w-3.5" /> Marcar no mapa
                    </button>
                    <a
                      href={canVerify ? mapsUrl() : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!canVerify}
                      onClick={e => { if (!canVerify) e.preventDefault() }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                        canVerify ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Google Maps
                    </a>
                  </div>
                </div>

                {!canVerify && (
                  <p className="text-[11px] text-slate-400 mt-2">Preencha Endereço e Cidade para conferir no mapa.</p>
                )}

                {verify.status === 'found' && (
                  <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                    <p className="text-[11px] font-semibold text-amber-800">Encontramos este endereço — é esse mesmo?</p>
                    <p className="text-xs text-slate-700 mt-1">{verify.label}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setVerify({ status: 'confirmed', label: verify.label, lat: verify.lat, lng: verify.lng })}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" /> É esse
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerify({ status: 'idle' })}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Não é — corrigir
                      </button>
                    </div>
                  </div>
                )}

                {verify.status === 'confirmed' && (
                  <p className="mt-2 text-[11px] text-emerald-700 flex items-start gap-1">
                    <Check className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                    <span>Endereço confirmado no mapa · {verify.lat.toFixed(5)}, {verify.lng.toFixed(5)}</span>
                  </p>
                )}

                {verify.status === 'notfound' && (
                  <p className="mt-2 text-[11px] text-amber-700 flex items-start gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                    <span>Não localizamos pelo endereço. Use <strong>Marcar no mapa</strong> para colocar o pino você mesmo no lugar certo.</span>
                  </p>
                )}

                {showMap && (
                  <div className="mt-2.5">
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      🎯 Clique no lugar certo ou <strong>arraste o pino</strong> até a casa. Dê zoom para acertar em cheio.
                    </p>
                    <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-200">
                      <MapPicker
                        key={mapKey}
                        initial={
                          verify.status === 'found' || verify.status === 'confirmed'
                            ? { lat: verify.lat, lng: verify.lng }
                            : null
                        }
                        onPick={pickOnMap}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={2}
                  placeholder="Vagas de estacionamento, ponto de referência..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setOpen(false); setEditingId(null); setError(null) }} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Salvar alterações' : 'Salvar Local'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
