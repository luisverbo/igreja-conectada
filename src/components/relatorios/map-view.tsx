'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function fixLeafletIcon() {
  const proto = L.Icon.Default.prototype as any
  delete proto._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

function getBubbleColor(count: number): string {
  if (count >= 10) return '#7f1d1d'
  if (count >= 6)  return '#dc2626'
  if (count >= 4)  return '#ea580c'
  if (count >= 2)  return '#7c3aed'
  return '#a78bfa'
}

function makeBubbleIcon(count: number, radius: number) {
  const color = getBubbleColor(count)
  const size = radius * 2
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};opacity:0.85;border:2px solid white;
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:${count > 9 ? 11 : 13}px;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [radius, radius],
  })
}

function makeCellIcon(leaderName: string | null) {
  const nameHtml = leaderName
    ? `<div style="background:rgba(109,40,217,0.92);color:white;border-radius:4px;padding:2px 6px;font-size:9px;font-weight:700;white-space:nowrap;margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.25);max-width:110px;overflow:hidden;text-overflow:ellipsis;">${leaderName}</div>`
    : ''
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="background:#7c3aed;width:30px;height:30px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:15px;">🏠</div>
      ${nameHtml}
    </div>`,
    iconSize: [120, 52],
    iconAnchor: [60, 30],
  })
}

interface PersonMarker { id: string; full_name: string; status: string; neighborhood: string | null; latitude: number; longitude: number }
interface DiscipleshipMarker { id: string; name: string; leader_name: string | null; day_of_week: string | null; latitude: number; longitude: number }
interface NeighborhoodGroup { neighborhood: string; city: string; count: number; lat: number; lng: number }

interface Props {
  people: PersonMarker[]
  discipleships: DiscipleshipMarker[]
  novosGroups: NeighborhoodGroup[]
  membrosGroups: NeighborhoodGroup[]
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo Convertido', em_novos_membros: 'Em Novos Membros',
  concluiu_novos_membros: 'Concluiu NM', em_discipulado: 'Em Discipulado',
  em_acompanhamento: 'Em Acompanhamento', servindo: 'Servindo', inativo: 'Inativo',
}
const DAY_LABELS: Record<string, string> = {
  domingo: 'Domingo', segunda: 'Segunda', terca: 'Terça',
  quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado',
}

type Tab = 'novos' | 'membros' | 'celulas' | 'todos'

export function MapView({ people, discipleships, novosGroups, membrosGroups }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('novos')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { fixLeafletIcon(); setMounted(true) }, [])

  if (!mounted) {
    return <div className="h-96 rounded-xl bg-slate-100 flex items-center justify-center"><p className="text-slate-400 text-sm">Carregando mapa...</p></div>
  }

  const defaultCenter: [number, number] = [-15.7801, -47.9292]

  const novoPeople = people.filter(p => p.status === 'novo')
  const membrosPeople = people.filter(p => p.status !== 'novo')

  const activeGroups = activeTab === 'novos' ? novosGroups
    : activeTab === 'membros' || activeTab === 'todos' ? membrosGroups
    : []
  const activePeople = activeTab === 'novos' ? novoPeople
    : activeTab === 'membros' || activeTab === 'todos' ? membrosPeople
    : []
  const showCells = activeTab === 'celulas' || activeTab === 'todos'

  const hasCells = discipleships.length > 0
  const hasGroups = activeGroups.length > 0

  const mapCenter: [number, number] = activeTab === 'celulas'
    ? (hasCells ? [discipleships[0].latitude, discipleships[0].longitude] : defaultCenter)
    : (hasGroups ? [activeGroups[0].lat, activeGroups[0].lng] : defaultCenter)

  const mapZoom = activeTab === 'celulas'
    ? (hasCells ? 12 : 5)
    : (hasGroups ? 11 : 5)

  const maxCount = Math.max(...activeGroups.map(n => n.count), 1)

  const tabs: { key: Tab; label: string; count: number | null }[] = [
    { key: 'novos', label: 'Novos Convertidos', count: novosGroups.reduce((s, n) => s + n.count, 0) },
    { key: 'membros', label: 'Membros', count: membrosGroups.reduce((s, n) => s + n.count, 0) },
    { key: 'celulas', label: 'Células', count: discipleships.length },
    { key: 'todos', label: 'Membros + Células', count: null },
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === t.key ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t.label}{t.count !== null ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: '460px' }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {activeGroups.map((n, i) => {
            const radius = 16 + Math.round((n.count / maxCount) * 24)
            return (
              <Marker key={`nb-${i}`} position={[n.lat, n.lng]} icon={makeBubbleIcon(n.count, radius)}>
                <Popup>
                  <div className="text-sm space-y-0.5">
                    <p className="font-bold" style={{ color: getBubbleColor(n.count) }}>{n.neighborhood || n.city}</p>
                    {n.neighborhood && n.city && <p className="text-slate-500">{n.city}</p>}
                    <p className="text-slate-800 font-semibold">{n.count} {n.count === 1 ? 'pessoa' : 'pessoas'}</p>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {activePeople.map(p => (
            <Marker key={`p-${p.id}`} position={[p.latitude, p.longitude]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.full_name}</p>
                  <p className="text-slate-600">{STATUS_LABELS[p.status] || p.status}</p>
                  {p.neighborhood && <p className="text-slate-500">{p.neighborhood}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {showCells && discipleships.map(d => (
            <Marker key={`d-${d.id}`} position={[d.latitude, d.longitude]} icon={makeCellIcon(d.leader_name)}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{d.name}</p>
                  {d.leader_name && <p className="text-slate-600">Líder: {d.leader_name}</p>}
                  {d.day_of_week && <p className="text-slate-500">{DAY_LABELS[d.day_of_week] || d.day_of_week}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legenda de cores */}
      {activeTab !== 'celulas' && hasGroups && (
        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
          <span className="font-medium text-slate-600">Legenda:</span>
          {[
            { label: '1 pessoa', color: '#a78bfa' },
            { label: '2–3', color: '#7c3aed' },
            { label: '4–5', color: '#ea580c' },
            { label: '6–9', color: '#dc2626' },
            { label: '10+', color: '#7f1d1d' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      {/* Ranking de bairros */}
      {activeTab !== 'celulas' && hasGroups && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-slate-600 mb-2">Ranking de Bairros</p>
          <div className="space-y-1.5">
            {[...activeGroups].sort((a, b) => b.count - a.count).map((n, i) => {
              const total = activeGroups.reduce((s, x) => s + x.count, 0)
              const pct = Math.round((n.count / total) * 100)
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4 text-right">{i + 1}.</span>
                  <span className="text-xs text-slate-700 w-32 truncate">{n.neighborhood || n.city}</span>
                  <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
                    <div className="h-4 rounded flex items-center pl-1.5 transition-all" style={{ width: `${Math.max(pct, 8)}%`, background: getBubbleColor(n.count) }}>
                      <span className="text-white text-xs font-bold">{n.count}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'novos' && novosGroups.length === 0 && (
        <p className="text-center text-xs text-slate-400">Nenhum novo convertido com bairro/cidade cadastrado.</p>
      )}
      {activeTab === 'membros' && membrosGroups.length === 0 && (
        <p className="text-center text-xs text-slate-400">Nenhum membro com bairro/cidade cadastrado.</p>
      )}
      {activeTab === 'celulas' && !hasCells && (
        <p className="text-center text-xs text-slate-400">Adicione endereço aos discipulados para aparecerem aqui.</p>
      )}
      {activeTab === 'todos' && membrosGroups.length === 0 && !hasCells && (
        <p className="text-center text-xs text-slate-400">Cadastre membros e discipulados com endereço para ver no mapa.</p>
      )}
    </div>
  )
}
