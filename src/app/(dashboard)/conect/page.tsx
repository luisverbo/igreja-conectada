import { getSessionProfile } from '@/lib/get-profile'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { CONECT_ACCESS, CONECT_MANAGERS } from '@/lib/roles'
import { ConectBoard, type ConectPerson } from '@/components/conect/conect-board'
import { ChurchQrCard } from '@/components/novos-membros/church-qr-card'

export const dynamic = 'force-dynamic'

/**
 * Caixa do Conect: quem chegou (aceitou Jesus ou veio de outra igreja)
 * e ainda não entrou em Novos Membros. A liderança distribui para a
 * equipe; cada um registra os contatos e encaminha para Novos Membros.
 */
export default async function ConectPage() {
  const { supabase, user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null
  const hasAccess = CONECT_ACCESS.includes(profile.role) || (profile.custom_access || []).includes('conect')
  if (!hasAccess) redirect('/dashboard')
  const isManager = CONECT_MANAGERS.includes(profile.role)

  let peopleQuery = supabase
    .from('people')
    .select('id, full_name, phone, origin, gender, birth_date, neighborhood, created_at, assigned_to, assigned:assigned_to(full_name)')
    .eq('church_id', profile.church_id)
    .eq('status', 'novo')
    .order('created_at', { ascending: false })
    .limit(500)
  if (!isManager) peopleQuery = peopleQuery.eq('assigned_to', profile.id)

  const [{ data: people }, { data: staff }, { data: classes }, { data: church }] = await Promise.all([
    peopleQuery,
    supabase.from('profiles').select('id, full_name, role').eq('church_id', profile.church_id).eq('is_active', true).order('full_name'),
    supabase.from('new_members_classes').select('id, name, enrollment_open, day_of_week, time_start, start_date')
      .eq('church_id', profile.church_id).eq('status', 'ativa').order('created_at', { ascending: false }),
    supabase.from('churches').select('name, welcome_token').eq('id', profile.church_id).single(),
  ])

  const ids = (people || []).map(p => p.id)
  const [{ data: contacts }, { data: waitlist }] = ids.length
    ? await Promise.all([
        supabase.from('conect_contacts')
          .select('person_id, result, wants_nm, note, created_at, by:contacted_by(full_name)')
          .eq('church_id', profile.church_id)
          .order('created_at', { ascending: false })
          .limit(3000),
        supabase.from('enrollment_waitlist').select('person_id').eq('church_id', profile.church_id).eq('status', 'aguardando'),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }]

  // Último contato e total de contatos por pessoa
  const lastContact = new Map<string, any>()
  const contactCount = new Map<string, number>()
  ;(contacts || []).forEach((c: any) => {
    if (!lastContact.has(c.person_id)) lastContact.set(c.person_id, c)
    contactCount.set(c.person_id, (contactCount.get(c.person_id) || 0) + 1)
  })
  const waiting = new Set((waitlist || []).map((w: any) => w.person_id))

  const rows: ConectPerson[] = (people || []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    origin: p.origin,
    neighborhood: p.neighborhood,
    created_at: p.created_at,
    assigned_to: p.assigned_to,
    assigned_name: p.assigned?.full_name ?? null,
    last_contact: lastContact.get(p.id)
      ? { result: lastContact.get(p.id).result, note: lastContact.get(p.id).note, wants_nm: lastContact.get(p.id).wants_nm, created_at: lastContact.get(p.id).created_at, by: lastContact.get(p.id).by?.full_name ?? null }
      : null,
    contacts: contactCount.get(p.id) || 0,
    in_waitlist: waiting.has(p.id),
  }))

  return (
    <div>
      <Header title="Conect" description="Acolhimento de quem chega à igreja" userName={profile.full_name} userRole={profile.role} />
      <div className="p-4 sm:p-6 space-y-6">
        <ConectBoard
          people={rows}
          isManager={isManager}
          myId={profile.id}
          staff={(staff || []).map(s => ({ id: s.id, full_name: s.full_name, role: s.role }))}
          classes={(classes || []).map(c => ({ id: c.id, name: c.name, enrollment_open: c.enrollment_open, day_of_week: c.day_of_week, time_start: c.time_start }))}
        />

        {isManager && church?.welcome_token && (
          <ChurchQrCard
            token={church.welcome_token}
            churchName={church.name}
            path="/boas-vindas/"
            title="QR Code do balcão do Conect"
            description={<>Imprima e deixe no balcão. A pessoa escaneia, diz se <strong>aceitou Jesus</strong> ou <strong>veio de outra igreja</strong>, recebe as mensagens de boas-vindas e aparece aqui na caixa do Conect.</>}
            posterTitle="Seja bem-vindo(a)!"
            posterCta="e deixe seu contato com a gente 💜"
            fileName="qrcode-balcao-conect.png"
          />
        )}
      </div>
    </div>
  )
}
