// ============================================================
// WHATSAPP - Evolution API Integration (server-side only)
// ============================================================

import { createAdminClient } from '@/lib/supabase/admin'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.WHATSAPP_API_KEY || ''

interface SendMessageParams {
  churchId: string
  phone: string
  message: string
}

/**
 * Sends a WhatsApp message using the church's default Evolution API instance.
 * Falls back silently (returns false) when no instance is connected or the
 * API is unreachable — messaging must never break the main flow.
 */
export async function sendWhatsAppMessage({ churchId, phone, message }: SendMessageParams): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return false

  try {
    const admin = createAdminClient()
    const { data: instance } = await admin
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('church_id', churchId)
      .eq('is_default', true)
      .maybeSingle()

    // Fall back to any instance of the church when none is marked default
    let instanceName = instance?.instance_name
    if (!instanceName) {
      const { data: anyInstance } = await admin
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('church_id', churchId)
        .limit(1)
        .maybeSingle()
      instanceName = anyInstance?.instance_name
    }
    if (!instanceName) return false

    const cleaned = phone.replace(/\D/g, '')
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`

    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: `${number}@s.whatsapp.net`,
        text: message,
      }),
    })

    return res.ok
  } catch {
    return false
  }
}

/**
 * Sends a message and logs it in whatsapp_notifications.
 * Fire-and-forget friendly: never throws.
 */
export async function sendAndLogWhatsApp(params: SendMessageParams & { personId?: string; messageType?: string }): Promise<boolean> {
  const { churchId, phone, message, personId, messageType } = params
  const admin = createAdminClient()

  const { data: notification } = await admin.from('whatsapp_notifications').insert({
    church_id: churchId,
    person_id: personId || null,
    phone,
    message_type: messageType || 'comunicado_geral',
    message,
    status: 'pending',
  }).select('id').single()

  const sent = await sendWhatsAppMessage({ churchId, phone, message })

  if (notification) {
    await admin.from('whatsapp_notifications').update({
      status: sent ? 'sent' : 'failed',
      sent_at: sent ? new Date().toISOString() : null,
    }).eq('id', notification.id)
  }

  return sent
}
