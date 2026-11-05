import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchDue } from '@/lib/journey'

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
  const result = await dispatchDue(admin)
  return NextResponse.json({ ok: true, ...result })
}
