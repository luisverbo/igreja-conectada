// ============================================================
// WHATSAPP - Message templates (pure functions, client-safe)
// ============================================================

export function msgBoasVindasDecisao(personName: string, churchName: string): string {
  return `Olá, ${personName}! 🙏

Que alegria receber você hoje em ${churchName}!

A decisão que você tomou hoje é o início de uma jornada incrível. Nos próximos dias, alguém da nossa equipe entrará em contato para te apresentar os próximos passos.

Fique à vontade para entrar em contato conosco se tiver alguma dúvida. Estamos aqui para cuidar de você! 💜`
}

export function msgBoasVindasNovosMembros(personName: string, className: string, dayOfWeek?: string, time?: string): string {
  const schedule = [
    dayOfWeek ? `📅 Dia: ${dayOfWeek}` : '',
    time ? `⏰ Horário: ${time}` : '',
  ].filter(Boolean).join('\n')

  return `Olá, ${personName}! 📚

Sua matrícula na turma *${className}* foi confirmada!
${schedule ? `\n${schedule}\n` : ''}
Nos Novos Membros você vai conhecer mais sobre nossa igreja, nossa fé e como se integrar à família. Te esperamos!

Qualquer dúvida, é só chamar. 💜`
}

export function msgConclusaoNovosMembros(personName: string, churchName: string): string {
  return `Parabéns, ${personName}! 🎓✨

Você concluiu o curso de *Novos Membros* da ${churchName}!

Este é um grande passo na sua jornada espiritual. O próximo passo é entrar para um Discipulado/Célula, onde você vai crescer ainda mais na fé em comunidade.

Em breve alguém da nossa equipe vai te apresentar um grupo! 💜`
}

export function msgLiberadoServir(personName: string, churchName: string): string {
  return `Boa notícia, ${personName}! ⭐

Você foi liberado(a) para servir na ${churchName}!

Você demonstrou maturidade espiritual e comprometimento com sua jornada de fé. Estamos entusiasmados para vê-lo(a) servindo!

Em breve nossa equipe vai entrar em contato para apresentar as oportunidades de voluntariado disponíveis. 💜`
}

export const DAY_LABELS: Record<string, string> = {
  domingo: 'Domingo', segunda: 'Segunda-feira', terca: 'Terça-feira',
  quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado',
}
