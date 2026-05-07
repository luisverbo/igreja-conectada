'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix leaflet default icon issue with webpack/next.js
// Must be done client-side
function fixLeafletIcon() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = L.Icon.Default.prototype as any
  delete proto._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface PersonMarker {
  id: string
  full_name: string
  status: string
  neighborhood: string | null
  latitude: number
  longitude: number
}

interface DiscipleshipMarker {
  id: string
  name: string
  leader_name: string | null
  day_of_week: string | null
  latitude: number
  longitude: number
}

interface Props {
  people: PersonMarker[]
  discipleships: DiscipleshipMarker[]
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo Convertido',
  em_novos_membros: 'Em Novos Membros',
  concluiu_novos_membros: 'Concluiu Novos Membros',
  em_discipulado: 'Em Discipulado',
  em_acompanhamento: 'Em Acompanhamento',
  servindo: 'Servindo',
  inativo: 'Inativo',
}

const DAY_LABELS: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
}

export function MapView({ people, discipleships }: Props) {
  const [activeTab, setActiveTab] = useState<'membros' | 'celulas'>('membros')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    fixLeafletIcon()
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-96 rounded-xl bg-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando mapa...</p>
      </div>
    )
  }

  // Default center: Brazil
  const center: [number, number] = [-15.7801, -47.9292]

  // Determine center from markers if available
  const membrosWithCoords = people.filter(p => p.latitude && p.longitude)
  const celulasWithCoords = discipleships.filter(d => d.latitude && d.longitude)

  const activeMarkers = activeTab === 'membros' ? membrosWithCoords : celulasWithCoords
  const mapCenter: [number, number] = activeMarkers.length > 0
    ? [activeMarkers[0].latitude, activeMarkers[0].longitude]
    : center

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('membros')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'membros'
              ? 'bg-violet-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Membros ({membrosWithCoords.length})
        </button>
        <button
          onClick={() => setActiveTab('celulas')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'celulas'
              ? 'bg-violet-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Células ({celulasWithCoords.length})
        </button>
      </div>

      {activeMarkers.length === 0 ? (
        <div className="h-64 rounded-xl bg-slate-100 flex items-center justify-center">
          <p className="text-slate-400 text-sm">
            {activeTab === 'membros'
              ? 'Nenhum membro com localização cadastrada ainda'
              : 'Nenhuma célula com localização cadastrada ainda'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: '420px' }}>
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {activeTab === 'membros' && membrosWithCoords.map(person => (
              <Marker key={person.id} position={[person.latitude, person.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{person.full_name}</p>
                    <p className="text-slate-600">{STATUS_LABELS[person.status] || person.status}</p>
                    {person.neighborhood && (
                      <p className="text-slate-500">{person.neighborhood}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {activeTab === 'celulas' && celulasWithCoords.map(disc => (
              <Marker key={disc.id} position={[disc.latitude, disc.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{disc.name}</p>
                    {disc.leader_name && (
                      <p className="text-slate-600">Líder: {disc.leader_name}</p>
                    )}
                    {disc.day_of_week && (
                      <p className="text-slate-500">{DAY_LABELS[disc.day_of_week] || disc.day_of_week}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
