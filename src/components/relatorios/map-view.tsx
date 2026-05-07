'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
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

interface PersonMarker { id: string; full_name: string; status: string; neighborhood: string | null; latitude: number; longitude: number }
interface DiscipleshipMarker { id: string; name: string; leader_name: string | null; day_of_week: string | null; latitude: number; longitude: number }
interface NeighborhoodGroup { neighborhood: string; city: string; count: number; lat: number; lng: number }

interface Props {
  people: PersonMarker[]
  discipleships: DiscipleshipMarker[]
  neighborhoodGroups: NeighborhoodGroup[]
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

export function MapView({ people, discipleships, neighborhoodGroups }: Props) {
  const [activeTab, setActiveTab] = useState<'membros' | 'celulas'>('membros')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { fixLeafletIcon(); setMounted(true) }, [])

  if (!mounted) {
    return <div className="h-96 rounded-xl bg-slate-100 flex items-center justify-center"><p className="text-slate-400 text-sm">Carregando mapa...</p></div>
  }

  const defaultCenter: [number, number] = [-15.7801, -47.9292]

  // For members tab: use neighborhood groups as primary data, individual markers as bonus
  const hasNeighborhoods = neighborhoodGroups.length > 0
  const hasDiscipleships = discipleships.length > 0

  const mapCenter: [number, number] = activeTab === 'membros'
    ? (hasNeighborhoods ? [neighborhoodGroups[0].lat, neighborhoodGroups[0].lng] : defaultCenter)
    : (hasDiscipleships ? [discipleships[0].latitude, discipleships[0].longitude] : defaultCenter)

  const mapZoom = activeTab === 'membros'
    ? (hasNeighborhoods ? 11 : 5)
    : (hasDiscipleships ? 12 : 5)

  // Max count for scaling bubble size
  const maxCount = Math.max(...neighborhoodGroups.map(n => n.count), 1)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('membros')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'membros' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          Membros por Bairro ({neighborhoodGroups.reduce((s, n) => s + n.count, 0)})
        </button>
        <button onClick={() => setActiveTab('celulas')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'celulas' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          Células ({discipleships.length})
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: '460px' }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {activeTab === 'membros' && neighborhoodGroups.map((n, i) => {
            const radius = 12 + Math.round((n.count / maxCount) * 28)
            return (
              <CircleMarker
                key={i}
                center={[n.lat, n.lng]}
                radius={radius}
                pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.55, weight: 2 }}
              >
                <Popup>
                  <div className="text-sm space-y-0.5">
                    <p className="font-bold text-violet-700">{n.neighborhood || n.city}</p>
                    {n.neighborhood && n.city && <p className="text-slate-500">{n.city}</p>}
                    <p className="text-slate-800 font-semibold">{n.count} {n.count === 1 ? 'membro' : 'membros'}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}

          {activeTab === 'membros' && people.map(p => (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.full_name}</p>
                  <p className="text-slate-600">{STATUS_LABELS[p.status] || p.status}</p>
                  {p.neighborhood && <p className="text-slate-500">{p.neighborhood}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {activeTab === 'celulas' && discipleships.map(d => (
            <Marker key={d.id} position={[d.latitude, d.longitude]}>
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

      {activeTab === 'membros' && !hasNeighborhoods && (
        <p className="text-center text-xs text-slate-400">Cadastre convertidos com bairro/cidade para ver no mapa.</p>
      )}
      {activeTab === 'celulas' && !hasDiscipleships && (
        <p className="text-center text-xs text-slate-400">Adicione endereço aos discipulados para aparecerem aqui.</p>
      )}
    </div>
  )
}
