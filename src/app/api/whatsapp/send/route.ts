import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAndLogWhatsApp } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { phone, message, message_type, person_id } = await req.json()
  if (!phone || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return NextResponse.json({ error: 'Sem igreja.' }, { status: 403 })

  const sent = await sendAndLogWhatsApp({
    churchId: profile.church_id,
    phone,
    message,
    personId: person_id || undefined,
    messageType: message_type || 'comunicado_geral',
  })

  return NextResponse.json({ success: sent })
}
