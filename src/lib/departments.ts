// Departamentos: reconhecer, no que a pessoa escreveu ("Ministério de
// Louvor", "louvor e música", "Diaconia"), qual departamento cadastrado é.

export interface DeptLike { id: string; name: string; keywords?: string[] | null }

/** minúsculas, sem acento, sem pontuação e sem palavras de ligação */
export function normDept(s: string | null | undefined): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter(w => w && !['de', 'da', 'do', 'dos', 'das', 'e', 'o', 'a', 'os', 'as', 'ministerio', 'departamento', 'equipe', 'grupo', 'no', 'na'].includes(w))
    .join(' ')
    .trim()
}

/** "diaconato" ≈ "diaconia" ≈ "diacono": compara pelo começo da palavra */
const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w)

function termsMatch(written: string, term: string): boolean {
  const a = normDept(written), b = normDept(term)
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  const aw = a.split(' ').map(stem), bw = b.split(' ').map(stem)
  // todas as palavras do termo aparecem no que foi escrito
  return bw.every(w => aw.includes(w))
}

/** Departamentos que batem com um texto livre escrito pela pessoa */
export function matchDepartments(written: string, depts: DeptLike[]): DeptLike[] {
  return depts.filter(d => [d.name, ...(d.keywords || [])].some(t => termsMatch(written, t)))
}

/** Separa o que a pessoa escreveu em itens ("Louvor e Mídia" → 2) */
export function splitWritten(list: string[] | null | undefined): string[] {
  return (list || [])
    .flatMap(s => s.split(/[,;/+]| e (?=[A-Za-zÀ-ú])/))
    .map(s => s.trim())
    .filter(Boolean)
}
