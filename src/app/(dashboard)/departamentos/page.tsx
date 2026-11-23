import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Layers, Users, Lightbulb, HelpCircle } from 'lucide-react'
import { getSessionProfile } from '@/lib/get-profile'
import { Header } from '@/components/layout/header'
import { DEPT_ACCESS, DEPT_MANAGERS, FULL_ACCESS } from '@/lib/roles'
import { loadDepartmentsData } from '@/lib/departments-data'
import { BarList } from '@/components/departamentos/bar-list'
import { DepartmentDialog } from '@/components/departamentos/department-dialog'
import { DepartmentTeamCard } from '@/components/configuracoes/department-team-card'

export const dynamic = 'force-dynamic'

export default async function DepartamentosPage() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null
  const canSee = DEPT_ACCESS.includes(profile.role) || (profile.custom_access || []).includes('departamentos')
  if (!canSee) redirect('/dashboard')
  const isManager = DEPT_MANAGERS.includes(profile.role)
  const onlyMine = profile.role === 'department_leader' && !isManager

  const data = await loadDepartmentsData(supabase, profile.church_id, onlyMine ? profile.id : undefined)
  const { data: users } = isManager
    ? await supabase.from('profiles').select('id, full_name').eq('church_id', profile.church_id).eq('is_active', true).order('full_name')
    : { data: [] as { id: string; full_name: string }[] }

  if (data.error) {
    return (
      <div>
        <Header title="Departamentos" description="Onde cada pessoa serve" userName={profile.full_name} userRole={profile.role} />
        <div className="p-4 sm:p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Os departamentos ainda não estão ativados no banco de dados. Rode o SQL dos departamentos no Supabase e recarregue a página.
          </div>
        </div>
      </div>
    )
  }

  const totalServing = new Set([...data.membersByDept.values()].flat().map(m => m.person.id)).size
  const totalSuggestions = [...data.suggestionsByDept.values()].reduce((a, l) => a + l.length, 0)
  const bars = data.departments.map(d => {
    const count = data.membersByDept.get(d.id)?.length || 0
    const sug = data.suggestionsByDept.get(d.id)?.length || 0
    return {
      key: d.id, label: d.name, value: count, href: `/departamentos/${d.id}`,
      note: [d.leader_display ? `Líder: ${d.leader_display}` : null, sug ? `${sug} para confirmar` : null, d.active ? null : 'inativo'].filter(Boolean).join(' · ') || undefined,
      hint: `${d.name}: ${count} confirmados${sug ? ` · ${sug} sugestões para confirmar` : ''}`,
    }
  }).sort((a, b) => b.value - a.value)

  return (
    <div>
      <Header title="Departamentos" description="Onde cada pessoa serve" userName={profile.full_name} userRole={profile.role} />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Números */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Departamentos', value: data.departments.length, icon: Layers, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Pessoas servindo', value: totalServing, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Sugestões para confirmar', value: totalSuggestions, icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <span className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}><Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} /></span>
                <span>
                  <span className="block text-lg sm:text-xl font-bold text-slate-900 leading-none sm:leading-normal">{s.value}</span>
                  <span className="block text-[11px] sm:text-xs text-slate-500 leading-tight mt-1 sm:mt-0">{s.label}</span>
                </span>
              </div>
            )
          })}
        </div>

        {/* Gráfico */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pessoas por departamento</h2>
              <p className="text-xs text-slate-500">Confirmadas em cada departamento. Toque num departamento para ver quem são, de qual GCA e quem é o líder.</p>
            </div>
            {isManager && <DepartmentDialog users={users || []} />}
          </div>
          <BarList items={bars} emptyText={isManager ? 'Nenhum departamento cadastrado. Comece em “Novo departamento”.' : 'Você ainda não lidera nenhum departamento.'} />
        </div>

        {/* O que as pessoas escreveram e não existe como departamento */}
        {isManager && data.unmatched.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><HelpCircle className="h-4 w-4 text-amber-600" /> Escrito no link do GCA, mas sem departamento cadastrado</h2>
            <p className="text-xs text-slate-600 mt-0.5 mb-3">
              Crie o departamento (ou, se for outro nome de um que já existe, coloque em “Outros nomes” dele) e as pessoas aparecem como sugestão para confirmar.
            </p>
            <div className="divide-y divide-amber-100 rounded-xl border border-amber-100 bg-white">
              {data.unmatched.slice(0, 30).map(u => (
                <div key={u.label} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-sm text-slate-800 truncate">“{u.label}” <span className="text-xs text-slate-400">· {u.count} {u.count === 1 ? 'pessoa' : 'pessoas'}</span></span>
                  <DepartmentDialog users={users || []} trigger="link" label="Criar departamento" initial={{ name: u.label.charAt(0).toUpperCase() + u.label.slice(1) }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        {data.departments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.departments.map(d => {
              const count = data.membersByDept.get(d.id)?.length || 0
              const sug = data.suggestionsByDept.get(d.id)?.length || 0
              return (
                <Link key={d.id} href={`/departamentos/${d.id}`} className={`rounded-xl border bg-white p-4 hover:border-violet-300 ${d.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                  <p className="font-semibold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.leader_display ? `Líder: ${d.leader_display}` : 'Sem líder definido'}</p>
                  <p className="text-sm mt-2"><strong className="text-slate-900">{count}</strong> <span className="text-slate-500">{count === 1 ? 'pessoa' : 'pessoas'}</span>
                    {sug > 0 && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{sug} para confirmar</span>}
                  </p>
                </Link>
              )
            })}
          </div>
        )}

        {isManager && (
          <DepartmentTeamCard
            churchId={profile.church_id}
            currentUserId={profile.id}
            title="Líderes de departamento"
            description="Login para o líder que quiser cuidar da própria equipe no sistema (ver os membros, gerar o link, confirmar sugestões). É opcional — o departamento funciona sem isso."
            deptRoles={['department_leader']}
            assignRoles={FULL_ACCESS.includes(profile.role) ? ['department_leader'] : []}
            canEdit={isManager}
            moduleKey="departamentos"
            moduleLabel="Departamentos"
          />
        )}
      </div>
    </div>
  )
}
