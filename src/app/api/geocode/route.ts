import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Geocodifica um endereço no servidor (o Nominatim exige User-Agent,
 * que o navegador não deixa enviar). Tenta variações do endereço, da
 * mais específica para a mais genérica, até achar.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { address, neighborhood, city, state } = await req.json()
  if (!city || (!address && !neighborhood)) {
    return NextResponse.json({ error: 'Informe pelo menos o endereço (ou bairro) e a cidade.' }, { status: 400 })
  }

  // "Rua X, N° 38" / "nº 38" / "no 38" → "Rua X, 38" (o Nominatim não entende "N°")
  const cleanAddress = (address || '')
    .replace(/\bn[°ºo]?\.?\s*(\d)/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const parts = (list: (string | null | undefined)[]) =>
    list.map(s => (s || '').trim()).filter(Boolean).join(', ')

  // Da mais completa para a mais genérica — a primeira que resolver ganha.
  // precise=false marca as que localizam só a região (bairro/cidade).
  const attempts: { q: string; precise: boolean }[] = [
    { q: parts([cleanAddress, neighborhood, city, state]), precise: true },
    { q: parts([cleanAddress, city, state]), precise: true },
    // Sem o número — geolocaliza a rua
    { q: parts([cleanAddress.replace(/,?\s*\d+\s*$/, ''), neighborhood, city, state]), precise: true },
    { q: parts([neighborhood, city, state]), precise: false },
  ].filter((a, i, arr) => a.q && arr.findIndex(b => b.q === a.q) === i)

  for (const attempt of attempts) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(attempt.q + ', Brasil')}&format=json&limit=1&countrycodes=br&addressdetails=1`,
        { headers: { 'User-Agent': 'IgrejaConectada/1.0 (contato@igrejaconectada)' }, next: { revalidate: 86400 } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json({
          found: true,
          precise: attempt.precise,
          label: data[0].display_name as string,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        })
      }
    } catch { /* tenta a próxima variação */ }
  }

  return NextResponse.json({ found: false })
}
