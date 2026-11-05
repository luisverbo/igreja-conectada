import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX = 22

const tidy = (s: unknown) =>
  String(s || '')
    .replace(/[<>{}\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX)
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && ['de', 'da', 'do', 'dos', 'das', 'e'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')

const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Envio público do certificado (nomes do casal) pelo link da campanha. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name1 = tidy(body.name1)
  const name2 = tidy(body.name2)
  if (!body.token || !name1 || !name2) {
    return NextResponse.json({ error: 'Preencha os dois nomes do casal.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: campaign } = await supabase
    .from('certificate_campaigns')
    .select('id, church_id, active')
    .eq('token', body.token)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 })
  if (!campaign.active) return NextResponse.json({ error: 'Este link já foi encerrado.' }, { status: 400 })

  // Mesmo casal enviando de novo (em qualquer ordem) não duplica
  const { data: existing } = await supabase
    .from('certificates')
    .select('id, name1, name2')
    .eq('campaign_id', campaign.id)
  const pair = [key(name1), key(name2)].sort().join('|')
  if ((existing || []).some(c => [key(c.name1), key(c.name2 || '')].sort().join('|') === pair)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const { error } = await supabase.from('certificates').insert({
    campaign_id: campaign.id,
    church_id: campaign.church_id,
    name1,
    name2,
  })
  if (error) return NextResponse.json({ error: 'Erro ao salvar. Tente novamente.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
