import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAndLogWhatsApp } from '@/lib/whatsapp'
import {
  msgBoasVindasDecisao,
  msgBoasVindasNovosMembros,
  msgConclusaoNovosMembros,
  msgLiberadoServir,
  DAY_LABELS,
} from '@/lib/whatsapp-templates'

/**
 * Composes and sends an automatic WhatsApp notification for a journey event.
 * body: { type, personId, classId? }
 * types: boas_vindas_decisao | boas_vindas_novos_membros | conclusao_novos_membros | liberado_servir
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id')
    .eq('id', user.id)
    .single()
  if (!profile?.church_id) return NextResponse.json({ error: 'Sem igreja.' }, { status: 403 })

  const { type, personId, classId } = await req.json()
  if (!type || !personId) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: person } = await admin
    .from('people')
    .select('full_name, phone, church_id')
    .eq('id', personId)
    .single()

  if (!person || person.church_id !== profile.church_id) {
    return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })
  }
  if (!person.phone) {
    return NextResponse.json({ ok: false, skipped: 'sem_telefone' })
  }

  const { data: church } = await admin
    .from('churches')
    .select('name')
    .eq('id', profile.church_id)
    .single()
  const churchName = church?.name || 'nossa igreja'

  let message: string
  let messageType: string

  switch (type) {
    case 'boas_vindas_decisao':
      message = msgBoasVindasDecisao(person.full_name, churchName)
      messageType = 'boas_vindas_decisao'
      break

    case 'boas_vindas_novos_membros': {
      let className = 'Novos Membros'
      let day: string | undefined
      let time: string | undefined
      if (classId) {
        const { data: turma } = await admin
          .from('new_members_classes')
          .select('name, day_of_week, time_start')
          .eq('id', classId)
          .single()
        if (turma) {
          className = turma.name
          day = turma.day_of_week ? DAY_LABELS[turma.day_of_week] || turma.day_of_week : undefined
          time = turma.time_start?.slice(0, 5)
        }
      }
      message = msgBoasVindasNovosMembros(person.full_name, className, day, time)
      messageType = 'boas_vindas_novos_membros'
      break
    }

    case 'conclusao_novos_membros':
      message = msgConclusaoNovosMembros(person.full_name, churchName)
      messageType = 'conclusao_novos_membros'
      break

    case 'liberado_servir':
      message = msgLiberadoServir(person.full_name, churchName)
      messageType = 'comunicado_geral'
      break

    default:
      return NextResponse.json({ error: 'Tipo de notificação inválido.' }, { status: 400 })
  }

  const sent = await sendAndLogWhatsApp({
    churchId: profile.church_id,
    phone: person.phone,
    message,
    personId,
    messageType,
  })

  return NextResponse.json({ ok: sent })
}
