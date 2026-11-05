import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { geocodeAddress } from '@/lib/geocode'
import { startJourney, dispatchDue } from '@/lib/journey'

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '')
const phoneKey = (s: string) => onlyDigits(s).slice(-8)
const normName = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Cadastro pelo QR Code do balcão do Conect (link fixo da igreja).
 * A pessoa diz se aceitou Jesus ou veio de outra igreja e entra no fluxo:
 * mensagens automáticas da origem dela (vídeo de boas-vindas na hora) e
 * responsável pelo acompanhamento (regras de encaminhamento / Conect).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const full_name = String(body.full_name || '').replace(/\s+/g, ' ').trim().slice(0, 120)
  const phone = String(body.phone || '').trim()
  const origin = body.origin === 'veio_de_outra_igreja' ? 'veio_de_outra_igreja' : body.origin === 'aceitou_jesus_aqui' ? 'aceitou_jesus_aqui' : null
  if (!full_name || phoneKey(phone).length < 8 || !origin || !body.token) {
    return NextResponse.json({ error: 'Preencha nome, WhatsApp e como você chegou até nós.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: church } = await admin.from('churches').select('id').eq('welcome_token', body.token).maybeSingle()
  if (!church) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 })
  const churchId = church.id

  const gender = body.gender === 'M' || body.gender === 'F' ? body.gender : null
  const birth_date = /^\d{4}-\d{2}-\d{2}$/.test(body.birth_date || '') ? body.birth_date : null
  const street = [String(body.address || '').trim(), String(body.number || '').trim()].filter(Boolean).join(', ')
  const addressFields = {
    address: street || null,
    neighborhood: String(body.neighborhood || '').trim() || null,
    city: String(body.city || '').trim() || null,
    state: String(body.state || '').trim().toUpperCase() || null,
  }
  const fromChurch = origin === 'veio_de_outra_igreja' ? String(body.previous_church || '').trim().slice(0, 120) : ''
  const today = new Date().toISOString().slice(0, 10)

  // Já tem cadastro? (telefone primeiro, depois nome exato)
  const { data: candidates } = await admin
    .from('people').select('id, full_name, phone, status, origin').eq('church_id', churchId).limit(10000)
  const byPhone = (candidates || []).filter(p => p.phone && phoneKey(p.phone) === phoneKey(phone))
  const existing =
    byPhone.find(p => normName(p.full_name) === normName(full_name)) ||
    (byPhone.length === 1 ? byPhone[0] : undefined) ||
    (candidates || []).find(p => normName(p.full_name) === normName(full_name) && !p.phone)

  let personId: string
  if (existing) {
    personId = existing.id
    await admin.from('people').update({
      phone,
      ...(gender ? { gender } : {}),
      ...(birth_date ? { birth_date } : {}),
      ...(addressFields.address || addressFields.neighborhood ? addressFields : {}),
      ...(existing.origin ? {} : { origin }),
    }).eq('id', personId)
  } else {
    const { data: created, error } = await admin.from('people').insert({
      church_id: churchId,
      full_name,
      phone,
      gender,
      birth_date,
      ...addressFields,
      origin,
      accepted_jesus_at: origin === 'aceitou_jesus_aqui' ? today : null,
      how_met_church: fromChurch ? `Veio da igreja: ${fromChurch}` : null,
      status: 'novo',
      can_serve: false,
    }).select('id').single()
    if (error || !created) return NextResponse.json({ error: 'Erro ao salvar. Tente novamente.' }, { status: 500 })
    personId = created.id

    await admin.from('journey_events').insert({
      person_id: personId,
      event_type: 'cadastrado',
      description: origin === 'veio_de_outra_igreja'
        ? `Cadastrou-se no balcão do Conect (veio de outra igreja${fromChurch ? `: ${fromChurch}` : ''})`
        : 'Cadastrou-se no balcão do Conect',
    })
    if (origin === 'aceitou_jesus_aqui') {
      await admin.from('journey_events').insert({
        person_id: personId, event_type: 'aceitou_jesus', description: 'Aceitou Jesus (informado no balcão do Conect)', event_date: today,
      })
    }
  }

  // Entra no fluxo: mensagens automáticas + responsável
  const journey = await startJourney(admin, { churchId, personId })

  const cep = onlyDigits(body.cep || '')
  after(async () => {
    // Vídeo/mensagem de "envio na hora" sai já
    if (journey.scheduled > 0) await dispatchDue(admin, { personId })
    // Posição no mapa (CEP manda)
    if (cep.length === 8 || (addressFields.city && (addressFields.address || addressFields.neighborhood))) {
      const geo = await geocodeAddress({ ...addressFields, cep })
      if (geo.found) await admin.from('people').update({ latitude: geo.lat, longitude: geo.lng }).eq('id', personId)
    }
  })

  return NextResponse.json({ ok: true, existing: !!existing })
}
