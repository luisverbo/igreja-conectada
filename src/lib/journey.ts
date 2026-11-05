// Porta de entrada da jornada: o que acontece quando alguém entra no
// sistema como novo convertido ou vindo de outra igreja.
// Só roda no servidor (usa a chave de serviço).

import type { createAdminClient } from '@/lib/supabase/admin'
import { sendAndLogWhatsApp, sendWhatsAppMessage, sendWhatsAppMedia } from '@/lib/whatsapp'

type Admin = ReturnType<typeof createAdminClient>

export type Origin = 'aceitou_jesus_aqui' | 'veio_de_outra_igreja'

/** Para quem vale cada mensagem automática (followup_rules.trigger_event) */
export const FOLLOWUP_AUDIENCES: Record<string, string> = {
  aceitou_jesus: 'Quem aceitou Jesus',
  outra_igreja: 'Quem veio de outra igreja',
  todos: 'Todos que chegam',
}

const triggersFor = (origin: Origin | string | null) =>
  origin === 'veio_de_outra_igreja' ? ['outra_igreja', 'todos'] : ['aceitou_jesus', 'todos']

function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

export function caregiverAlert(caregiverName: string, person: { full_name: string; phone: string | null }, origin?: string | null) {
  const what = origin === 'veio_de_outra_igreja' ? 'Uma pessoa que veio de outra igreja' : 'Um novo convertido'
  return `Olá, ${(caregiverName || '').split(' ')[0]}! 🙏\n\n${what} foi encaminhado(a) para o seu acompanhamento:\n\n👤 *${person.full_name}*${person.phone ? `\n📱 ${person.phone}` : ''}\n\nEntre em contato para dar as boas-vindas e iniciar o acompanhamento. 💜`
}

/**
 * Coloca a pessoa no fluxo:
 * 1. agenda as mensagens automáticas da igreja para a origem dela
 *    (inclusive as de "envio na hora", que saem logo em seguida)
 * 2. aplica as regras de encaminhamento (sexo/idade → responsável),
 *    só se ela ainda não tiver responsável, e avisa o responsável
 */
export async function startJourney(admin: Admin, o: { churchId: string; personId: string; actorId?: string | null }) {
  const { data: person } = await admin
    .from('people')
    .select('id, full_name, phone, gender, birth_date, church_id, origin, assigned_to')
    .eq('id', o.personId)
    .single()
  if (!person || person.church_id !== o.churchId) return { scheduled: 0, assignedTo: null as string | null }

  let scheduled = 0
  let assignedTo: string | null = person.assigned_to

  // 1. Mensagens automáticas (sem duplicar se a pessoa já estava no fluxo)
  if (person.phone) {
    const { data: rules } = await admin
      .from('followup_rules')
      .select('id, delay_hours')
      .eq('church_id', o.churchId)
      .in('trigger_event', triggersFor(person.origin))
      .eq('active', true)

    if (rules && rules.length > 0) {
      const { data: already } = await admin
        .from('scheduled_messages').select('rule_id').eq('person_id', person.id).in('rule_id', rules.map(r => r.id))
      const done = new Set((already || []).map(a => a.rule_id))
      const rows = rules.filter(r => !done.has(r.id)).map(r => ({
        church_id: o.churchId,
        person_id: person.id,
        rule_id: r.id,
        phone: person.phone!,
        send_at: new Date(Date.now() + r.delay_hours * 3600 * 1000).toISOString(),
        status: 'pendente',
      }))
      if (rows.length) {
        const { error } = await admin.from('scheduled_messages').insert(rows)
        if (!error) scheduled = rows.length
      }
    }
  }

  // 2. Responsável pelo acompanhamento (primeira regra que bater, por prioridade)
  if (!person.assigned_to) {
    const { data: careRules } = await admin
      .from('care_rules')
      .select('id, gender, age_min, age_max, assigned_to, profiles:assigned_to(full_name, phone)')
      .eq('church_id', o.churchId)
      .eq('active', true)
      .order('priority')

    const age = ageFromBirthDate(person.birth_date)
    const match = (careRules || []).find(r => {
      if (r.gender && r.gender !== person.gender) return false
      if (r.age_min != null && (age === null || age < r.age_min)) return false
      if (r.age_max != null && (age === null || age > r.age_max)) return false
      return true
    })

    if (match) {
      assignedTo = match.assigned_to
      const caregiver = match.profiles as any
      await admin.from('people').update({ assigned_to: match.assigned_to }).eq('id', person.id)
      await admin.from('journey_events').insert({
        person_id: person.id,
        event_type: 'observacao',
        description: `Encaminhado(a) para acompanhamento de ${caregiver?.full_name || 'responsável'}`,
        recorded_by: o.actorId || null,
      })
      if (caregiver?.phone) {
        sendAndLogWhatsApp({
          churchId: o.churchId,
          phone: caregiver.phone,
          message: caregiverAlert(caregiver.full_name, person, person.origin),
          personId: person.id,
          messageType: 'alerta_pastoral',
        }).catch(() => {})
      }
    }
  }

  return { scheduled, assignedTo }
}

/**
 * Envia as mensagens agendadas que já venceram. Chamado pelo cron a cada
 * 15 minutos e, logo após um cadastro, só para aquela pessoa (é assim que
 * as mensagens de "envio na hora" saem na hora). Personaliza {nome}.
 */
export async function dispatchDue(admin: Admin, o: { personId?: string; limit?: number } = {}) {
  let q = admin
    .from('scheduled_messages')
    .select('id, church_id, person_id, phone, rule_id, custom_message, followup_rules(message_type, content, media_url, active), people(full_name)')
    .eq('status', 'pendente')
    .lte('send_at', new Date().toISOString())
    .limit(o.limit ?? 50)
  if (o.personId) q = q.eq('person_id', o.personId)
  const { data: due } = await q

  let sent = 0, failed = 0
  for (const msg of due || []) {
    // Marca antes de enviar: evita que o cron e o envio imediato mandem duas vezes
    const { data: claimed } = await admin.from('scheduled_messages')
      .update({ status: 'enviando' }).eq('id', msg.id).eq('status', 'pendente').select('id')
    if (!claimed?.length) {
      // banco antigo sem o status 'enviando': segue sem a trava
      const { data: still } = await admin.from('scheduled_messages').select('status').eq('id', msg.id).single()
      if (still?.status !== 'pendente') continue
    }

    const rule = msg.followup_rules as any
    const person = msg.people as any
    let ok = false

    if (msg.custom_message) {
      // Mensagem avulsa (ex: lembrete de aula ao professor)
      ok = await sendWhatsAppMessage({ churchId: msg.church_id, phone: msg.phone, message: msg.custom_message })
    } else if (!rule || rule.active === false) {
      // Regra apagada ou desativada depois de agendar
      await admin.from('scheduled_messages').update({ status: 'cancelado' }).eq('id', msg.id)
      continue
    } else {
      const firstName = (person?.full_name || '').split(' ')[0]
      const content = (rule.content || '').replaceAll('{nome}', firstName)
      ok = rule.message_type === 'texto'
        ? await sendWhatsAppMessage({ churchId: msg.church_id, phone: msg.phone, message: content })
        : await sendWhatsAppMedia({ churchId: msg.church_id, phone: msg.phone, mediaType: rule.message_type, mediaUrl: rule.media_url, caption: content })
    }

    await admin.from('scheduled_messages').update({
      status: ok ? 'enviado' : 'falhou',
      sent_at: ok ? new Date().toISOString() : null,
    }).eq('id', msg.id)
    if (ok) sent++; else failed++
  }
  return { processed: due?.length || 0, sent, failed }
}
