import { haversineKm } from '@/lib/geo'

export interface GeocodeInput {
  address?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  /** CEP (com ou sem traço) — quando vem, é a referência principal */
  cep?: string | null
}

export interface GeocodeResult {
  found: boolean
  precise?: boolean
  label?: string
  lat?: number
  lng?: number
  /** De onde veio a posição: número da casa (endereço), rua do CEP ou só a região */
  source?: 'endereco' | 'cep' | 'regiao'
}

/** Até onde o resultado do endereço pode ficar do ponto do CEP para ser aceito */
const MAX_KM_FROM_CEP = 1.5

const onlyDigits = (s: string | null | undefined) => (s || '').replace(/\D/g, '')

/**
 * Coordenadas do CEP. No Brasil o CEP corresponde à rua (ou trecho dela),
 * então é uma referência bem mais confiável que buscar o endereço por texto.
 * Tenta a AwesomeAPI (traz latitude/longitude) e, se falhar, a BrasilAPI.
 */
export async function geocodeCep(cep: string | null | undefined): Promise<{ lat: number; lng: number; label?: string } | null> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return null

  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${digits}`, { next: { revalidate: 86400 * 30 } })
    if (res.ok) {
      const d = await res.json()
      const lat = parseFloat(d?.lat), lng = parseFloat(d?.lng)
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        return { lat, lng, label: [d.address, d.district, d.city, d.state].filter(Boolean).join(', ') }
      }
    }
  } catch { /* tenta a próxima */ }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, { next: { revalidate: 86400 * 30 } })
    if (res.ok) {
      const d = await res.json()
      const c = d?.location?.coordinates
      const lat = parseFloat(c?.latitude), lng = parseFloat(c?.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng, label: [d.street, d.neighborhood, d.city, d.state].filter(Boolean).join(', ') }
      }
    }
  } catch { /* sem coordenadas pelo CEP */ }

  return null
}

/**
 * Geocodifica um endereço. Só roda no servidor (o Nominatim exige
 * User-Agent, que o navegador não envia).
 *
 * Com CEP: pega o ponto da rua pelo CEP e tenta refinar até o número da
 * casa pelo endereço — mas só aceita o refinamento se ele cair perto do
 * CEP (evita o mapa jogar a pessoa numa rua homônima de outro bairro).
 * Sem CEP: tenta variações do endereço, da mais específica à mais genérica.
 */
export async function geocodeAddress({ address, neighborhood, city, state, cep }: GeocodeInput): Promise<GeocodeResult> {
  const cepPoint = await geocodeCep(cep)
  if (!city && !cepPoint) return { found: false }
  if (!address && !neighborhood && !cepPoint) return { found: false }

  // "Rua X, N° 38" / "nº 38" / "no 38" → "Rua X, 38" (o Nominatim não entende "N°")
  const cleanAddress = (address || '')
    .replace(/\bn[°ºo]?\.?\s*(\d)/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const hasNumber = /\d/.test(cleanAddress)

  const parts = (list: (string | null | undefined)[]) =>
    list.map(s => (s || '').trim()).filter(Boolean).join(', ')

  // precise=false marca as que localizam só a região (bairro/cidade)
  const attempts: { q: string; precise: boolean }[] = (cepPoint
    // Com CEP só vale a pena tentar o número exato; a rua o CEP já resolve
    ? (hasNumber ? [
        { q: parts([cleanAddress, neighborhood, city, state]), precise: true },
        { q: parts([cleanAddress, city, state]), precise: true },
      ] : [])
    : [
        { q: parts([cleanAddress, neighborhood, city, state]), precise: true },
        { q: parts([cleanAddress, city, state]), precise: true },
        // Sem o número — geolocaliza a rua
        { q: parts([cleanAddress.replace(/,?\s*\d+\s*$/, ''), neighborhood, city, state]), precise: true },
        { q: parts([neighborhood, city, state]), precise: false },
      ]
  ).filter((a, i, arr) => a.q && arr.findIndex(b => b.q === a.q) === i)

  for (const attempt of attempts) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(attempt.q + ', Brasil')}&format=json&limit=1&countrycodes=br&addressdetails=1`,
        { headers: { 'User-Agent': 'IgrejaConectada/1.0 (contato@igrejaconectada)' }, next: { revalidate: 86400 } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon)
        // Longe demais do CEP = achou a rua errada → descarta
        if (cepPoint && haversineKm(lat, lng, cepPoint.lat, cepPoint.lng) > MAX_KM_FROM_CEP) continue
        return {
          found: true,
          precise: attempt.precise,
          label: data[0].display_name as string,
          lat, lng,
          source: attempt.precise ? 'endereco' : 'regiao',
        }
      }
    } catch { /* tenta a próxima variação */ }
  }

  if (cepPoint) {
    return { found: true, precise: true, label: cepPoint.label ? `${cepPoint.label} (pelo CEP)` : 'Localizado pelo CEP', lat: cepPoint.lat, lng: cepPoint.lng, source: 'cep' }
  }
  return { found: false }
}
