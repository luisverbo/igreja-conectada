import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '')
const phoneKey = (s: string) => onlyDigits(s).slice(-8)
const normName = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Cadastro público pelo link do departamento. Reaproveita o cadastro da
 * pessoa (telefone ou nome) e liga ao departamento. Quem ainda não estava
 * no sistema entra como "servindo" (já serve na igreja).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const full_name = String(body.full_name || '').replace(/\s+/g, ' ').trim().slice(0, 120)
  const phone = String(body.phone || '').trim()
  if (!full_name || phoneKey(phone).length < 8 || !body.token) {
    return NextResponse.json({ error: 'Preencha seu nome e WhatsApp.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: dept } = await admin.from('departments').select('id, church_id, name, active').eq('signup_token', body.token).maybeSingle()
  if (!dept || !dept.active) return NextResponse.json({ error: 'Link inválido ou desativado.' }, { status: 404 })
  const churchId = dept.church_id

  const gender = body.gender === 'M' || body.gender === 'F' ? body.gender : null
  const birth_date = /^\d{4}-\d{2}-\d{2}$/.test(body.birth_date || '') ? body.birth_date : null

  const { data: candidates } = await admin
    .from('people').select('id, full_name, phone, serves_departments').eq('church_id', churchId).limit(10000)
  const byPhone = (candidates || []).filter(p => p.phone && phoneKey(p.phone) === phoneKey(phone))
  const existing =
    byPhone.find(p => normName(p.full_name) === normName(full_name)) ||
    (byPhone.length === 1 ? byPhone[0] : undefined) ||
    (candidates || []).find(p => normName(p.full_name) === normName(full_name) && !p.phone)

  let personId: string
  if (existing) {
    personId = existing.id
    const serves = Array.isArray(existing.serves_departments) ? existing.serves_departments : []
    await admin.from('people').update({
      phone,
      ...(gender ? { gender } : {}),
      ...(birth_date ? { birth_date } : {}),
      ...(serves.some((d: string) => normName(d) === normName(dept.name)) ? {} : { serves_departments: [...serves, dept.name] }),
    }).eq('id', personId)
  } else {
    const { data: created, error } = await admin.from('people').insert({
      church_id: churchId, full_name, phone, gender, birth_date,
      status: 'servindo', can_serve: true, serves_departments: [dept.name],
    }).select('id').single()
    if (error || !created) return NextResponse.json({ error: 'Erro ao salvar. Tente novamente.' }, { status: 500 })
    personId = created.id
    await admin.from('journey_events').insert({
      person_id: personId, event_type: 'cadastrado', description: `Cadastrou-se pelo link do departamento ${dept.name}`,
    })
  }

  const { error } = await admin.from('department_members').upsert(
    { department_id: dept.id, person_id: personId, church_id: churchId, source: 'link' },
    { onConflict: 'department_id,person_id', ignoreDuplicates: true },
  )
  if (error) return NextResponse.json({ error: 'Erro ao salvar. Tente novamente.' }, { status: 500 })
  return NextResponse.json({ ok: true, existing: !!existing, departmentName: dept.name })
}
