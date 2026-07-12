import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAndLogWhatsApp } from '@/lib/whatsapp'

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

/**
 * Called after a person accepts Jesus:
 * 1. Schedules the church's automatic follow-up messages
 * 2. Applies care rules: assigns a caregiver by gender/age and alerts them
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

  const { personId } = await req.json()
  if (!personId) return NextResponse.json({ error: 'Pessoa não informada.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: person } = await admin
    .from('people')
    .select('id, full_name, phone, gender, birth_date, church_id')
    .eq('id', personId)
    .single()

  if (!person || person.church_id !== profile.church_id) {
    return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })
  }

  const churchId = profile.church_id
  let scheduled = 0
  let assignedTo: string | null = null

  // 1. Schedule follow-up messages
  if (person.phone) {
    const { data: rules } = await admin
      .from('followup_rules')
      .select('id, delay_hours')
      .eq('church_id', churchId)
      .eq('trigger_event', 'aceitou_jesus')
      .eq('active', true)

    if (rules && rules.length > 0) {
      const rows = rules.map(r => ({
        church_id: churchId,
        person_id: person.id,
        rule_id: r.id,
        phone: person.phone,
        send_at: new Date(Date.now() + r.delay_hours * 3600 * 1000).toISOString(),
        status: 'pendente',
      }))
      const { error } = await admin.from('scheduled_messages').insert(rows)
      if (!error) scheduled = rows.length
    }
  }

  // 2. Care assignment rules (first active match by priority)
  const { data: careRules } = await admin
    .from('care_rules')
    .select('id, gender, age_min, age_max, assigned_to, profiles:assigned_to(full_name, phone)')
    .eq('church_id', churchId)
    .eq('active', true)
    .order('priority')

  if (careRules && careRules.length > 0) {
    const age = ageFromBirthDate(person.birth_date)

    const match = careRules.find(r => {
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
        recorded_by: user.id,
      })

      // Alert the caregiver on WhatsApp
      if (caregiver?.phone) {
        sendAndLogWhatsApp({
          churchId,
          phone: caregiver.phone,
          message: `Olá, ${(caregiver.full_name || '').split(' ')[0]}! 🙏\n\nUm novo convertido foi encaminhado para o seu acompanhamento:\n\n👤 *${person.full_name}*${person.phone ? `\n📱 ${person.phone}` : ''}\n\nEntre em contato para dar as boas-vindas e iniciar o acompanhamento. 💜`,
          personId: person.id,
          messageType: 'alerta_pastoral',
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true, scheduled, assignedTo })
}
