import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionProfile } from '@/lib/get-profile'
import { DEPT_ACCESS, DEPT_MANAGERS } from '@/lib/roles'
import { loadDepartmentsData } from '@/lib/departments-data'
import { BarList } from '@/components/departamentos/bar-list'
import { DepartmentDialog } from '@/components/departamentos/department-dialog'
import { SuggestionsPanel, MembersList, DeptLinkCard, DeleteDeptButton } from '@/components/departamentos/dept-manage'
import { ExportTableButtons } from '@/components/export-table-buttons'

export const dynamic = 'force-dynamic'

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()

export default async function DepartamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null
  const canSee = DEPT_ACCESS.includes(profile.role) || (profile.custom_access || []).includes('departamentos')
  if (!canSee) redirect('/dashboard')
  const isManager = DEPT_MANAGERS.includes(profile.role)

  const data = await loadDepartmentsData(supabase, profile.church_id)
  const dept = data.departments.find(d => d.id === id)
  if (!dept) notFound()
  const isLeader = dept.leader_id === profile.id
  if (!isManager && !isLeader && profile.role === 'department_leader') redirect('/departamentos')
  const canManage = isManager || isLeader

  const members = data.membersByDept.get(dept.id) || []
  const suggestions = data.suggestionsByDept.get(dept.id) || []
  const { data: users } = isManager
    ? await supabase.from('profiles').select('id, full_name').eq('church_id', profile.church_id).eq('is_active', true).order('full_name')
    : { data: [] as { id: string; full_name: string }[] }

  // De qual GCA são as pessoas deste departamento
  const byGca = new Map<string, { label: string; value: number; note?: string }>()
  members.forEach(m => {
    const key = m.person.gca || '— Sem GCA —'
    const cur = byGca.get(key)
    byGca.set(key, { label: key, value: (cur?.value || 0) + 1, note: m.person.gcaLeaders ? `Líder: ${m.person.gcaLeaders}` : cur?.note })
  })
  const gcaBars = [...byGca.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.value - a.value)

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <Link href="/departamentos" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-3">
          <ArrowLeft className="h-4 w-4" /> Departamentos
        </Link>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{dept.name}{!dept.active && <span className="ml-2 text-xs font-medium text-slate-400">(inativo)</span>}</h1>
            <p className="text-sm text-slate-500">{dept.leader_display ? `Líder: ${dept.leader_display}` : 'Sem líder definido'}{dept.leader_phone ? ` · ${dept.leader_phone}` : ''}</p>
            {dept.description && <p className="text-sm text-slate-500">{dept.description}</p>}
            {dept.keywords.length > 0 && <p className="text-xs text-slate-400 mt-0.5">Também reconhece: {dept.keywords.join(', ')}</p>}
          </div>
          {isManager && (
            <div className="flex items-center gap-2 flex-wrap">
              <DepartmentDialog users={users || []} trigger="edit" initial={{
                id: dept.id, name: dept.name, description: dept.description || '', keywords: dept.keywords.join(', '),
                leaderMode: dept.leader_id ? 'system' : dept.leader_name ? 'name' : 'none',
                leader_id: dept.leader_id || '', leader_name: dept.leader_name || '', leader_phone: dept.leader_phone || '', active: dept.active,
              }} />
              <DeleteDeptButton id={dept.id} name={dept.name} />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {canManage && <DeptLinkCard token={dept.signup_token} name={dept.name} leaderPhone={dept.leader_phone} />}

        {canManage && <SuggestionsPanel departmentId={dept.id} suggestions={suggestions} />}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-900">De qual GCA são</h2>
          <p className="text-xs text-slate-500 mb-4">{members.length} {members.length === 1 ? 'pessoa confirmada' : 'pessoas confirmadas'} no {dept.name}, por GCA.</p>
          <BarList items={gcaBars} emptyText="Ninguém confirmado ainda." />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-bold text-slate-900">Quem serve ({members.length})</h2>
            <ExportTableButtons
              title={dept.name}
              info={[`Líder: ${dept.leader_display || '—'}${dept.leader_phone ? ` · ${dept.leader_phone}` : ''}`, `${members.length} pessoas`]}
              fileBase={`departamento-${slug(dept.name)}`}
              columns={[
                { key: 'nome', label: 'Nome', pdfWidth: 60 },
                { key: 'telefone', label: 'WhatsApp', pdfWidth: 32 },
                { key: 'gca', label: 'GCA', pdfWidth: 55 },
                { key: 'lider', label: 'Líder do GCA', pdfWidth: 55 },
                { key: 'bairro', label: 'Bairro' },
              ]}
              rows={members.map(m => ({ nome: m.person.full_name, telefone: m.person.phone || '', gca: m.person.gca || 'Sem GCA', lider: m.person.gcaLeaders || '', bairro: m.person.neighborhood || '' }))}
            />
          </div>
          {canManage
            ? <MembersList departmentId={dept.id} churchId={profile.church_id} members={members} />
            : (
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                {members.map(m => (
                  <div key={m.person.id} className="px-4 py-2.5">
                    <p className="text-sm font-semibold text-slate-900">{m.person.full_name}</p>
                    <p className="text-xs text-slate-500">{m.person.gca ? `🏠 ${m.person.gca}${m.person.gcaLeaders ? ` · Líder: ${m.person.gcaLeaders}` : ''}` : 'Sem GCA'}</p>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
