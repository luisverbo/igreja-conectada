import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { geocodeAddress } from '@/lib/geocode'

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '')

/** Últimos 8 dígitos — ignora DDD, 9º dígito e formatação na comparação */
const phoneKey = (s: string) => onlyDigits(s).slice(-8)

const normName = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Cadastro público de membro de GCA.
 * - gcaToken: link fixo de um GCA (o líder manda no grupo dele)
 * - churchToken + discipleshipId: link geral, a pessoa escolheu o GCA
 *
 * Reaproveita o cadastro se a pessoa já existir (telefone ou nome) e
 * vincula ao GCA. Se ela já está ativa em OUTRO GCA, não transfere
 * sozinha: abre uma solicitação de transferência para a gestão aprovar.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const full_name: string = (body.full_name || '').trim()
  const phone: string = (body.phone || '').trim()
  if (!full_name || phoneKey(phone).length < 8) {
    return NextResponse.json({ error: 'Informe seu nome e um WhatsApp válido.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ── Resolve o GCA (a igreja vem SEMPRE do GCA validado) ──
  let gca: { id: string; name: string; church_id: string; status: string } | null = null
  if (body.gcaToken) {
    const { data } = await supabase
      .from('discipleships')
      .select('id, name, church_id, status')
      .eq('signup_token', body.gcaToken)
      .maybeSingle()
    gca = data
  } else if (body.churchToken && body.discipleshipId) {
    const { data: church } = await supabase
      .from('churches').select('id').eq('gca_signup_token', body.churchToken).maybeSingle()
    if (church) {
      const { data } = await supabase
        .from('discipleships')
        .select('id, name, church_id, status')
        .eq('id', body.discipleshipId)
        .eq('church_id', church.id)
        .maybeSingle()
      gca = data
    }
  }
  if (!gca || gca.status !== 'ativo') {
    return NextResponse.json({ error: 'GCA não encontrado ou inativo.' }, { status: 404 })
  }
  const churchId = gca.church_id

  // ── Encontra a pessoa: telefone primeiro, depois nome exato ──
  const { data: candidates } = await supabase
    .from('people')
    .select('id, full_name, phone, status')
    .eq('church_id', churchId)
    .limit(10000)

  const key = phoneKey(phone)
  const byPhone = (candidates || []).filter(p => p.phone && phoneKey(p.phone) === key)
  // Mesmo telefone pode ser de família: prefira quem tem o mesmo nome
  let person =
    byPhone.find(p => normName(p.full_name) === normName(full_name)) ||
    (byPhone.length === 1 ? byPhone[0] : undefined) ||
    (candidates || []).find(p => normName(p.full_name) === normName(full_name) && !p.phone)

  const nm: 'sim' | 'fazendo' | 'nao' = ['sim', 'fazendo', 'nao'].includes(body.nm) ? body.nm : 'nao'

  const street = [body.address?.trim(), body.number?.trim()].filter(Boolean).join(', ')
  const fullAddress = [street, body.complement?.trim()].filter(Boolean).join(' - ') || null
  const addressFields = {
    address: fullAddress,
    neighborhood: body.neighborhood?.trim() || null,
    city: body.city?.trim() || null,
    state: body.state?.trim()?.toUpperCase() || null,
  }
  const gender = body.gender === 'M' || body.gender === 'F' ? body.gender : null

  if (person) {
    // Atualiza com o que a pessoa acabou de informar (dados mais recentes)
    const update: Record<string, unknown> = { phone }
    if (fullAddress || addressFields.neighborhood) Object.assign(update, addressFields)
    if (body.birth_date) update.birth_date = body.birth_date
    if (gender) update.gender = gender
    // Só avança o status — nunca rebaixa quem já está mais adiante
    if (nm === 'sim' && ['novo', 'em_novos_membros', 'concluiu_novos_membros'].includes(person.status)) {
      update.status = 'em_discipulado'
    }
    await supabase.from('people').update(update).eq('id', person.id).eq('church_id', churchId)
  } else {
    const { data: created, error } = await supabase
      .from('people')
      .insert({
        church_id: churchId,
        full_name,
        phone,
        ...addressFields,
        birth_date: body.birth_date || null,
        gender,
        origin: 'veio_de_outra_igreja',
        // Quem ainda não fez NM aparece no radar para ser encaminhado ao curso
        status: nm === 'sim' ? 'em_discipulado' : nm === 'fazendo' ? 'em_novos_membros' : 'novo',
      })
      .select('id, full_name, phone, status')
      .single()
    if (error || !created) {
      return NextResponse.json({ error: 'Erro ao salvar seu cadastro. Tente novamente.' }, { status: 500 })
    }
    person = created
    await supabase.from('journey_events').insert({
      person_id: created.id,
      event_type: 'cadastrado',
      description: `Cadastrou-se pelo link do GCA ${gca.name}`,
      reference_type: 'discipulado',
      reference_id: gca.id,
    })
  }
  const personId = person!.id

  // ── Vínculo com o GCA ──
  const { data: memberships } = await supabase
    .from('discipleship_members')
    .select('discipleship_id, status')
    .eq('person_id', personId)
    .neq('status', 'inativo')

  const already = memberships?.some(m => m.discipleship_id === gca!.id)
  const other = memberships?.find(m => m.discipleship_id !== gca!.id)

  let result: 'vinculado' | 'ja_vinculado' | 'transferencia_solicitada' = 'vinculado'

  if (already) {
    result = 'ja_vinculado'
  } else if (other) {
    // Já está em outro GCA → a gestão decide (mesma regra do encaminhamento)
    const { data: pending } = await supabase
      .from('gca_requests')
      .select('id')
      .eq('person_id', personId)
      .eq('target_discipleship_id', gca.id)
      .eq('status', 'pendente')
      .maybeSingle()
    if (!pending) {
      await supabase.from('gca_requests').insert({
        church_id: churchId,
        person_id: personId,
        target_discipleship_id: gca.id,
        from_discipleship_id: other.discipleship_id,
        request_type: 'transferencia',
        reason: 'A própria pessoa se cadastrou pelo link deste GCA',
      })
    }
    result = 'transferencia_solicitada'
  } else {
    const { error: memberError } = await supabase
      .from('discipleship_members')
      .upsert(
        { discipleship_id: gca.id, person_id: personId, status: 'ativo' },
        { onConflict: 'discipleship_id,person_id' }
      )
    if (memberError) {
      return NextResponse.json({ error: 'Erro ao vincular ao GCA. Tente novamente.' }, { status: 500 })
    }
    await supabase.from('journey_events').insert({
      person_id: personId,
      event_type: 'entrou_discipulado',
      description: `Entrou no GCA ${gca.name} (cadastro pelo link)${nm !== 'sim' ? ` — informou que ${nm === 'fazendo' ? 'está fazendo' : 'ainda não fez'} Novos Membros` : ''}`,
      reference_type: 'discipulado',
      reference_id: gca.id,
    })
  }

  // Posição no mapa — depois da resposta, para não deixar a pessoa esperando
  if (addressFields.city && (addressFields.address || addressFields.neighborhood)) {
    after(async () => {
      const geo = await geocodeAddress(addressFields)
      if (geo.found) {
        await supabase.from('people')
          .update({ latitude: geo.lat, longitude: geo.lng })
          .eq('id', personId)
      }
    })
  }

  return NextResponse.json({ ok: true, result, gcaName: gca.name })
}
