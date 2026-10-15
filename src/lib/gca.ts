// Helpers de exibição dos líderes de GCA.
// Cada líder pode ser um usuário do sistema (leader/leader2 via profiles)
// ou apenas um nome cadastrado, para quem ainda não acessa o app.

interface GcaLike {
  leader?: { full_name?: string | null } | null
  leader2?: { full_name?: string | null } | null
  leader_name?: string | null
  leader2_name?: string | null
}

/** Nomes dos líderes, na ordem, ignorando os vazios. */
export function leaderNames(gca: GcaLike): string[] {
  const l1 = gca.leader?.full_name || gca.leader_name
  const l2 = gca.leader2?.full_name || gca.leader2_name
  return [l1, l2].filter(Boolean) as string[]
}

/** "João & Maria" (primeiros nomes) ou "João Silva" quando só há um. */
export function leadersShort(gca: GcaLike): string | null {
  const names = leaderNames(gca)
  if (names.length === 0) return null
  if (names.length === 1) return names[0]
  return names.map(n => n.split(' ')[0]).join(' & ')
}

/** "João Silva & Maria Silva" — nomes completos. */
export function leadersFull(gca: GcaLike): string | null {
  const names = leaderNames(gca)
  return names.length > 0 ? names.join(' & ') : null
}

// ── Limite de participantes ──────────────────────────────────────────

export interface GcaCapacity {
  /** Limite que vale para o GCA (próprio ou padrão da igreja); null = sem limite */
  limit: number | null
  count: number
  /** Quantos passaram do limite (0 quando dentro) */
  over: number
  /** Vagas restantes (null quando não há limite) */
  free: number | null
  state: 'sem_limite' | 'ok' | 'quase' | 'lotado' | 'acima'
}

/**
 * Lotação de um GCA. O limite próprio do GCA sobrepõe o padrão da
 * igreja. "quase" = 90% ou mais do limite.
 */
export function gcaCapacity(
  ownLimit: number | null | undefined,
  defaultLimit: number | null | undefined,
  count: number,
): GcaCapacity {
  const limit = ownLimit || defaultLimit || null
  if (!limit) return { limit: null, count, over: 0, free: null, state: 'sem_limite' }
  const over = Math.max(0, count - limit)
  const free = Math.max(0, limit - count)
  const state = count > limit ? 'acima' : count === limit ? 'lotado' : count >= limit * 0.9 ? 'quase' : 'ok'
  return { limit, count, over, free, state }
}

// ── Crianças (filhos dos membros) ────────────────────────────────────
// Não são membros do GCA e NÃO contam no limite de participantes.

export interface ChildRow { parent_id: string; full_name: string; birth_date: string | null }

const childKey = (c: ChildRow) =>
  `${c.full_name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()}|${c.birth_date || ''}`

/**
 * Quantas crianças cada GCA tem, a partir dos membros ativos e dos filhos
 * cadastrados. Se pai e mãe do mesmo GCA cadastraram o mesmo filho
 * (mesmo nome e nascimento), conta uma vez só.
 */
export function childrenByGca(
  members: { discipleship_id: string; person_id: string }[],
  children: ChildRow[],
): Record<string, number> {
  const kidsByParent = new Map<string, ChildRow[]>()
  children.forEach(c => kidsByParent.set(c.parent_id, [...(kidsByParent.get(c.parent_id) || []), c]))

  const seen: Record<string, Set<string>> = {}
  members.forEach(m => {
    for (const c of kidsByParent.get(m.person_id) || []) {
      (seen[m.discipleship_id] ||= new Set()).add(childKey(c))
    }
  })
  return Object.fromEntries(Object.entries(seen).map(([id, s]) => [id, s.size]))
}

/** "3 anos" / "8 meses" — bebês aparecem em meses */
export function childAgeLabel(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null
  const b = new Date(birthDate + 'T12:00:00')
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months--
  if (months < 0) return null
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}
