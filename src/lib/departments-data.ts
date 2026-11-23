// Carrega e cruza os dados dos departamentos (só no servidor).
import type { SupabaseClient } from '@supabase/supabase-js'
import { leadersShort } from '@/lib/gca'
import { matchDepartments, normDept, splitWritten } from '@/lib/departments'

export interface DeptRow {
  id: string; name: string; description: string | null; keywords: string[]
  leader_id: string | null; leader_name: string | null; leader_phone: string | null
  leader_display: string | null; signup_token: string; active: boolean
}
export interface PersonInfo {
  id: string; full_name: string; phone: string | null; neighborhood: string | null
  written: string[]; gca: string | null; gcaLeaders: string | null
}
export interface Suggestion { person: PersonInfo; matchedText: string }

export async function loadDepartmentsData(supabase: SupabaseClient, churchId: string, onlyLeaderId?: string) {
  let dq = supabase.from('departments')
    .select('id, name, description, keywords, leader_id, leader_name, leader_phone, signup_token, active, leader:leader_id(full_name)')
    .eq('church_id', churchId).order('name')
  if (onlyLeaderId) dq = dq.eq('leader_id', onlyLeaderId)

  const [{ data: depts, error }, { data: members }, { data: people }, { data: gcaRows }] = await Promise.all([
    dq,
    supabase.from('department_members').select('department_id, person_id, source, created_at').eq('church_id', churchId),
    supabase.from('people').select('id, full_name, phone, neighborhood, serves_departments').eq('church_id', churchId).limit(10000),
    supabase.from('discipleship_members')
      .select('person_id, discipleships!inner(name, church_id, leader_name, leader2_name, leader:profiles!discipleships_leader_id_fkey(full_name), leader2:profiles!discipleships_leader2_id_fkey(full_name))')
      .eq('discipleships.church_id', churchId)
      .neq('status', 'inativo'),
  ])

  const gcaByPerson = new Map<string, { name: string; leaders: string | null }>()
  ;(gcaRows || []).forEach((m: any) => {
    if (m.discipleships) gcaByPerson.set(m.person_id, { name: m.discipleships.name, leaders: leadersShort(m.discipleships) })
  })

  const personById = new Map<string, PersonInfo>()
  ;(people || []).forEach((p: any) => personById.set(p.id, {
    id: p.id, full_name: p.full_name, phone: p.phone, neighborhood: p.neighborhood,
    written: splitWritten(p.serves_departments),
    gca: gcaByPerson.get(p.id)?.name ?? null,
    gcaLeaders: gcaByPerson.get(p.id)?.leaders ?? null,
  }))

  const deptRows: DeptRow[] = (depts || []).map((d: any) => ({
    id: d.id, name: d.name, description: d.description, keywords: d.keywords || [],
    leader_id: d.leader_id, leader_name: d.leader_name, leader_phone: d.leader_phone,
    leader_display: d.leader?.full_name || d.leader_name || null,
    signup_token: d.signup_token, active: d.active,
  }))

  const membersByDept = new Map<string, { person: PersonInfo; source: string; created_at: string }[]>()
  const memberSet = new Set<string>()
  ;(members || []).forEach((m: any) => {
    const person = personById.get(m.person_id)
    if (!person) return
    memberSet.add(`${m.department_id}|${m.person_id}`)
    membersByDept.set(m.department_id, [...(membersByDept.get(m.department_id) || []), { person, source: m.source, created_at: m.created_at }])
  })
  membersByDept.forEach(list => list.sort((a, b) => a.person.full_name.localeCompare(b.person.full_name, 'pt-BR')))

  // Sugestões: quem escreveu algo que bate com o departamento e ainda não está nele
  const suggestionsByDept = new Map<string, Suggestion[]>()
  // O que as pessoas escreveram e não bate com nenhum departamento cadastrado
  const unmatched = new Map<string, { label: string; count: number }>()
  const allDepts = onlyLeaderId ? [] : deptRows // líder só vê os dele; "não reconhecidos" é visão da liderança
  personById.forEach(person => {
    for (const text of person.written) {
      const hits = matchDepartments(text, deptRows)
      for (const d of hits) {
        if (memberSet.has(`${d.id}|${person.id}`)) continue
        const list = suggestionsByDept.get(d.id) || []
        if (!list.some(s => s.person.id === person.id)) list.push({ person, matchedText: text })
        suggestionsByDept.set(d.id, list)
      }
      if (!onlyLeaderId && matchDepartments(text, allDepts).length === 0) {
        const key = normDept(text)
        if (!key) continue
        const cur = unmatched.get(key)
        unmatched.set(key, { label: cur?.label || text.trim(), count: (cur?.count || 0) + 1 })
      }
    }
  })
  suggestionsByDept.forEach(list => list.sort((a, b) => a.person.full_name.localeCompare(b.person.full_name, 'pt-BR')))

  return {
    error,
    departments: deptRows,
    membersByDept,
    suggestionsByDept,
    unmatched: [...unmatched.values()].sort((a, b) => b.count - a.count),
    peopleCount: personById.size,
  }
}
