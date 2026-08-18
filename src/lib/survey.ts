// Pesquisas dos GCAs — tipos de pergunta e rótulos compartilhados

export type QuestionType = 'texto' | 'longo' | 'escala' | 'sim_nao' | 'opcoes'

export interface SurveyQuestion {
  id: string
  type: QuestionType
  label: string
  options?: string[]   // para 'opcoes'
  required?: boolean
}

export const QUESTION_TYPES: { value: QuestionType; label: string; hint: string }[] = [
  { value: 'texto', label: 'Resposta curta', hint: 'Uma linha de texto' },
  { value: 'longo', label: 'Resposta longa', hint: 'Parágrafo' },
  { value: 'escala', label: 'Nota de 1 a 5', hint: 'Avaliação por estrelas' },
  { value: 'sim_nao', label: 'Sim ou Não', hint: 'Resposta objetiva' },
  { value: 'opcoes', label: 'Múltipla escolha', hint: 'Lista de opções' },
]

export type Audience = 'lideres' | 'anfitrioes' | 'membros' | 'interno'

export const AUDIENCE_META: Record<Audience, { label: string; short: string; desc: string; emoji: string }> = {
  lideres: {
    label: 'Líderes do GCA',
    short: 'Líderes',
    emoji: '👤',
    desc: 'O líder (e cônjuge) responde sobre o GCA dele.',
  },
  anfitrioes: {
    label: 'Anfitriões da casa',
    short: 'Anfitriões',
    emoji: '🏠',
    desc: 'Quem cede a casa responde sobre a experiência de sediar.',
  },
  membros: {
    label: 'Membros do GCA',
    short: 'Membros',
    emoji: '👥',
    desc: 'Os membros respondem — o líder apenas distribui o link, não responde.',
  },
  interno: {
    label: 'Uso interno (supervisor)',
    short: 'Interno',
    emoji: '📋',
    desc: 'Roteiro para o supervisor preencher durante a visita ao GCA.',
  },
}

export function newQuestionId() {
  return Math.random().toString(36).slice(2, 10)
}
