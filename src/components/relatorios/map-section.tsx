'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Map } from 'lucide-react'

const MapView = dynamic(
  () => import('./map-view').then(mod => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 rounded-xl bg-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando mapa...</p>
      </div>
    ),
  }
)

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

interface NeighborhoodGroup {
  neighborhood: string
  city: string
  count: number
  lat: number
  lng: number
}

interface Props {
  people: PersonMarker[]
  discipleships: DiscipleshipMarker[]
  neighborhoodGroups: NeighborhoodGroup[]
}

export function MapSection({ people, discipleships, neighborhoodGroups }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-4 w-4 text-violet-600" />
          Mapa de Membros e Células
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MapView people={people} discipleships={discipleships} neighborhoodGroups={neighborhoodGroups} />
      </CardContent>
    </Card>
  )
}
