import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEPT_MANAGERS } from '@/lib/roles'

const clean = (s: unknown, max = 120) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/**
 * Departamentos:
 *  - save / delete:         só a liderança (cadastra, edita, define líder)
 *  - addMembers / removeMember: liderança ou o líder daquele departamento
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { data: me } = await supabase.from('profiles').select('id, church_id, role, full_name').eq('id', user.id).single()
  if (!me?.church_id) return NextResponse.json({ error: 'Sem igreja.' }, { status: 403 })
  const isManager = DEPT_MANAGERS.includes(me.role)

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  async function loadDept(id: string) {
    const { data } = await admin.from('departments').select('id, church_id, name, leader_id').eq('id', id).maybeSingle()
    return data && data.church_id === me!.church_id ? data : null
  }

  // ── Cadastrar / editar ──
  if (body.action === 'save') {
    if (!isManager) return NextResponse.json({ error: 'Só a liderança cadastra departamentos.' }, { status: 403 })
    const name = clean(body.name, 80)
    if (!name) return NextResponse.json({ error: 'Informe o nome do departamento.' }, { status: 400 })
    const keywords = (Array.isArray(body.keywords) ? body.keywords : String(body.keywords || '').split(','))
      .map((k: unknown) => clean(k, 40)).filter(Boolean).slice(0, 20)
    let leader_id: string | null = body.leaderMode === 'system' ? body.leader_id || null : null
    if (leader_id) {
      const { data: l } = await admin.from('profiles').select('church_id').eq('id', leader_id).maybeSingle()
      if (l?.church_id !== me.church_id) leader_id = null
    }
    const payload = {
      name,
      description: clean(body.description, 300) || null,
      keywords,
      leader_id,
      leader_name: body.leaderMode === 'name' ? clean(body.leader_name) || null : null,
      leader_phone: body.leaderMode === 'name' ? clean(body.leader_phone, 30) || null : null,
      active: body.active !== false,
    }
    if (body.id) {
      if (!(await loadDept(body.id))) return NextResponse.json({ error: 'Departamento não encontrado.' }, { status: 404 })
      const { error } = await admin.from('departments').update(payload).eq('id', body.id)
      if (error) return NextResponse.json({ error: 'Erro ao salvar: ' + error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: body.id })
    }
    const { data, error } = await admin.from('departments').insert({ ...payload, church_id: me.church_id }).select('id').single()
    if (error) return NextResponse.json({ error: 'Erro ao salvar: ' + error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (body.action === 'delete') {
    if (!isManager) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    if (!(await loadDept(body.id))) return NextResponse.json({ error: 'Departamento não encontrado.' }, { status: 404 })
    await admin.from('departments').delete().eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  // ── Pessoas do departamento ──
  const dept = await loadDept(body.departmentId)
  if (!dept) return NextResponse.json({ error: 'Departamento não encontrado.' }, { status: 404 })
  if (!isManager && dept.leader_id !== me.id) return NextResponse.json({ error: 'Você não lidera este departamento.' }, { status: 403 })

  if (body.action === 'addMembers') {
    const ids: string[] = (Array.isArray(body.personIds) ? body.personIds : []).filter(Boolean).slice(0, 500)
    const source = ['sugestao', 'manual'].includes(body.source) ? body.source : 'manual'
    const { data: valid } = await admin.from('people').select('id').eq('church_id', me.church_id).in('id', ids)
    const rows = (valid || []).map(p => ({ department_id: dept.id, person_id: p.id, church_id: me.church_id, source, added_by: me.id }))
    if (rows.length === 0) return NextResponse.json({ error: 'Nenhuma pessoa válida.' }, { status: 400 })
    const { error } = await admin.from('department_members').upsert(rows, { onConflict: 'department_id,person_id', ignoreDuplicates: true })
    if (error) return NextResponse.json({ error: 'Erro ao adicionar: ' + error.message }, { status: 500 })
    return NextResponse.json({ ok: true, count: rows.length })
  }

  if (body.action === 'removeMember') {
    await admin.from('department_members').delete().eq('department_id', dept.id).eq('person_id', body.personId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
