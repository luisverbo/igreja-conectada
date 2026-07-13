import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, sendWhatsAppMedia } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Processes due scheduled messages. Called by Supabase pg_cron every
 * 15 minutes with a Bearer secret. Personalizes {nome} in content.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: due } = await admin
    .from('scheduled_messages')
    .select('id, church_id, person_id, phone, rule_id, followup_rules(message_type, content, media_url, active), people(full_name)')
    .eq('status', 'pendente')
    .lte('send_at', new Date().toISOString())
    .limit(50)

  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let sent = 0
  let failed = 0

  for (const msg of due) {
    const rule = msg.followup_rules as any
    const person = msg.people as any

    // Rule deleted or deactivated after scheduling → cancel
    if (!rule || rule.active === false) {
      await admin.from('scheduled_messages').update({ status: 'cancelado' }).eq('id', msg.id)
      continue
    }

    const firstName = (person?.full_name || '').split(' ')[0]
    const content = (rule.content || '').replaceAll('{nome}', firstName)

    let ok = false
    if (rule.message_type === 'texto') {
      ok = await sendWhatsAppMessage({ churchId: msg.church_id, phone: msg.phone, message: content })
    } else {
      ok = await sendWhatsAppMedia({
        churchId: msg.church_id,
        phone: msg.phone,
        mediaType: rule.message_type,
        mediaUrl: rule.media_url,
        caption: content,
      })
    }

    await admin.from('scheduled_messages').update({
      status: ok ? 'enviado' : 'falhou',
      sent_at: ok ? new Date().toISOString() : null,
    }).eq('id', msg.id)

    if (ok) sent++
    else failed++
  }

  return NextResponse.json({ ok: true, processed: due.length, sent, failed })
}
