import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone, message, message_type, person_id } = await req.json()
  if (!phone || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()

  // Log the notification
  const { data: notification } = await supabase.from('whatsapp_notifications').insert({
    church_id: profile?.church_id,
    person_id: person_id || null,
    phone,
    message_type: message_type || 'comunicado_geral',
    message,
    status: 'pending',
  }).select().single()

  // Send via Evolution API
  const sent = await sendWhatsAppMessage({ phone, message })

  // Update status
  if (notification) {
    await supabase.from('whatsapp_notifications').update({
      status: sent ? 'sent' : 'failed',
      sent_at: sent ? new Date().toISOString() : null,
    }).eq('id', notification.id)
  }

  return NextResponse.json({ success: sent })
}
