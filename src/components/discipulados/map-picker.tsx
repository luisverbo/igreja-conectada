'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
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

function ClickToPlace({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPlace(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

interface Props {
  initial: { lat: number; lng: number } | null
  onPick: (lat: number, lng: number) => void
}

/**
 * Mapa para marcar a posição exata de um local: clique para colocar
 * o pino ou arraste-o até o ponto certo. Cada ajuste dispara onPick.
 */
export function MapPicker({ initial, onPick }: Props) {
  fixLeafletIcon()
  const [pos, setPos] = useState(initial)

  function place(lat: number, lng: number) {
    setPos({ lat, lng })
    onPick(lat, lng)
  }

  return (
    <MapContainer
      center={pos ? [pos.lat, pos.lng] : [-14.235, -51.9253]}
      zoom={pos ? 17 : 4}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickToPlace onPlace={place} />
      {pos && (
        <Marker
          position={[pos.lat, pos.lng]}
          draggable
          eventHandlers={{
            dragend: e => {
              const p = (e.target as L.Marker).getLatLng()
              place(p.lat, p.lng)
            },
          }}
        />
      )}
    </MapContainer>
  )
}
