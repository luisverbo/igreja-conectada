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
