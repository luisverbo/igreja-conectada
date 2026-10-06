import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/geocode'

/** Geocodifica um endereço para usuários logados (ver lib/geocode). */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { address, neighborhood, city, state } = await req.json()
  if (!city || (!address && !neighborhood)) {
    return NextResponse.json({ error: 'Informe pelo menos o endereço (ou bairro) e a cidade.' }, { status: 400 })
  }

  return NextResponse.json(await geocodeAddress({ address, neighborhood, city, state }))
}
