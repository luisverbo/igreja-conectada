// Distância entre dois pontos (km) — fórmula de Haversine
export function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

interface GcaLike { latitude: number | null; longitude: number | null }

/**
 * Ordena GCAs pela proximidade das coordenadas da pessoa. GCAs sem
 * coordenadas vão para o fim (distância = Infinity).
 */
export function sortByProximity<T extends GcaLike>(
  gcas: T[],
  personLat: number | null,
  personLng: number | null,
): (T & { distanceKm: number | null })[] {
  return gcas
    .map(g => {
      let distanceKm: number | null = null
      if (personLat != null && personLng != null && g.latitude != null && g.longitude != null) {
        distanceKm = haversineKm(personLat, personLng, g.latitude, g.longitude)
      }
      return { ...g, distanceKm }
    })
    .sort((a, b) => {
      if (a.distanceKm == null) return 1
      if (b.distanceKm == null) return -1
      return a.distanceKm - b.distanceKm
    })
}
