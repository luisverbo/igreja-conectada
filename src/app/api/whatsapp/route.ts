import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ''

async function evo(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  try { return { ok: res.ok, data: JSON.parse(text) } } catch { return { ok: res.ok, data: text } }
}

// GET /api/whatsapp?action=list|qr|status&instance=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role').eq('id', user.id).single()
  if (!profile?.church_id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const action = req.nextUrl.searchParams.get('action')
  const instance = req.nextUrl.searchParams.get('instance')

  if (action === 'list') {
    const { data: instances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('church_id', profile.church_id)
      .order('created_at')
    return NextResponse.json({ instances: instances || [] })
  }

  if (action === 'qr' && instance) {
    const { ok, data } = await evo(`/instance/connect/${instance}`)
    if (!ok) return NextResponse.json({ error: 'Erro ao obter QR Code' }, { status: 400 })
    return NextResponse.json(data)
  }

  if (action === 'status' && instance) {
    const { ok, data } = await evo(`/instance/connectionState/${instance}`)
    if (!ok) return NextResponse.json({ error: 'Erro ao obter status' }, { status: 400 })

    // Update status in DB
    const status = data?.instance?.state || data?.state || 'close'
    const phone = data?.instance?.profileName || data?.me?.id?.split('@')[0] || null
    await supabase
      .from('whatsapp_instances')
      .update({ status, ...(phone ? { phone_number: phone } : {}) })
      .eq('instance_name', instance)
      .eq('church_id', profile.church_id)

    return NextResponse.json({ status, phone })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}

// POST /api/whatsapp  body: { action, instance, display_name }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('church_id, role').eq('id', user.id).single()
  if (!profile?.church_id || !['super_admin', 'pastor', 'coordinator'].includes(profile?.role || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { action, instance_name, display_name } = await req.json()

  if (action === 'create') {
    if (!instance_name || !display_name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

    // Create instance in Evolution API
    const { ok, data } = await evo('/instance/create', 'POST', {
      instanceName: instance_name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    })
    if (!ok) return NextResponse.json({ error: data?.message || 'Erro ao criar instância' }, { status: 400 })

    // Save to DB
    const { error: dbErr } = await supabase.from('whatsapp_instances').insert({
      church_id: profile.church_id,
      instance_name,
      display_name,
      status: 'close',
    })
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 })

    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    await evo(`/instance/delete/${instance_name}`, 'DELETE')
    await supabase.from('whatsapp_instances').delete().eq('instance_name', instance_name).eq('church_id', profile.church_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'logout') {
    await evo(`/instance/logout/${instance_name}`, 'DELETE')
    await supabase.from('whatsapp_instances').update({ status: 'close', phone_number: null }).eq('instance_name', instance_name).eq('church_id', profile.church_id)
    return NextResponse.json({ success: true })
  }

  if (action === 'set_default') {
    await supabase.from('whatsapp_instances').update({ is_default: false }).eq('church_id', profile.church_id)
    await supabase.from('whatsapp_instances').update({ is_default: true }).eq('instance_name', instance_name).eq('church_id', profile.church_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
