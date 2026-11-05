import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startJourney, dispatchDue } from '@/lib/journey'

/**
 * Coloca uma pessoa recém-cadastrada no fluxo (mensagens automáticas da
 * origem dela + responsável pelo acompanhamento). Ver lib/journey.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id').eq('id', user.id).single()
  if (!profile?.church_id) return NextResponse.json({ error: 'Sem igreja.' }, { status: 403 })

  const { personId } = await req.json()
  if (!personId) return NextResponse.json({ error: 'Pessoa não informada.' }, { status: 400 })

  const admin = createAdminClient()
  const result = await startJourney(admin, { churchId: profile.church_id, personId, actorId: user.id })

  // Mensagens de "envio na hora" saem já, sem esperar o cron
  if (result.scheduled > 0) after(() => dispatchDue(admin, { personId }).then(() => undefined))

  return NextResponse.json({ ok: true, ...result })
}
