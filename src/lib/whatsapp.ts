// ============================================================
// WHATSAPP - Evolution API Integration
// ============================================================

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'http://localhost:8080'
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || ''
const WHATSAPP_INSTANCE = process.env.WHATSAPP_INSTANCE || 'church-instance'

interface SendMessageParams {
  phone: string
  message: string
}

export async function sendWhatsAppMessage({ phone, message }: SendMessageParams): Promise<boolean> {
  try {
    const cleaned = phone.replace(/\D/g, '')
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`

    const res = await fetch(`${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_API_KEY,
      },
      body: JSON.stringify({
        number: `${number}@s.whatsapp.net`,
        text: message,
      }),
    })

    return res.ok
  } catch {
    return false
  }
}

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

export function msgBoasVindasDecisao(personName: string, churchName: string): string {
  return `Olá, ${personName}! 🙏

Que alegria receber você hoje em ${churchName}!

A decisão que você tomou hoje é o início de uma jornada incrível. Nos próximos dias, alguém da nossa equipe entrará em contato para te apresentar os próximos passos.

Fique à vontade para entrar em contato conosco se tiver alguma dúvida. Estamos aqui para cuidar de você! 💜`
}

export function msgBoasVindasNovosMembros(personName: string, className: string, dayOfWeek: string, time: string): string {
  return `Olá, ${personName}! 📚

Sua matrícula na turma *${className}* foi confirmada!

📅 Dia: ${dayOfWeek}
⏰ Horário: ${time}

Nos Novos Membros você vai conhecer mais sobre nossa igreja, nossa fé e como se integrar à família. Te esperamos!

Qualquer dúvida, é só chamar. 💜`
}

export function msgConclusaoNovosMembros(personName: string, churchName: string): string {
  return `Parabéns, ${personName}! 🎓✨

Você concluiu o curso de *Novos Membros* da ${churchName}!

Este é um grande passo na sua jornada espiritual. O próximo passo é entrar para um Discipulado/Célula, onde você vai crescer ainda mais na fé em comunidade.

Em breve alguém da nossa equipe vai te apresentar um grupo! 💜`
}

export function msgAlertaAcompanhamento(personName: string, leaderName: string): string {
  return `Olá, ${personName}! 💜

${leaderName}, seu líder de discipulado, registrou que você está em um momento que precisa de atenção especial.

Queremos que saiba que você não está sozinho(a). Estamos aqui para cuidar de você.

Se quiser conversar, é só chamar no WhatsApp ou aparecer na nossa igleja. 🙏`
}

export function msgLiberadoServir(personName: string, churchName: string): string {
  return `Boa notícia, ${personName}! ⭐

Você foi liberado(a) para servir na ${churchName}!

Você demonstrou maturidade espiritual e comprometimento com sua jornada de fé. Estamos entusiasmados para vê-lo(a) servindo!

Em breve nossa equipe vai entrar em contato para apresentar as oportunidades de voluntariado disponíveis. 💜`
}
