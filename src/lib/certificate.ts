'use client'

import { EB_Garamond } from 'next/font/google'

// Fonte do nome do casal (serifada itálica, como no modelo)
export const certFont = EB_Garamond({ subsets: ['latin'], weight: ['600'], style: ['italic', 'normal'] })

export interface CertTemplate {
  label: string
  src: string
  width: number
  height: number
  /** Onde vai o nome do casal: centro horizontal, linha de base, largura máxima */
  name: { cx: number; baseline: number; maxWidth: number; fontSize: number; color: string }
}

export const CERT_TEMPLATES: Record<string, CertTemplate> = {
  'lideranca-gca': {
    label: 'Treinamento de Liderança GCA',
    src: '/certificados/lideranca-gca.jpg',
    width: 1448,
    height: 1086,
    name: { cx: 724, baseline: 592, maxWidth: 660, fontSize: 66, color: '#10224a' },
  },
}

export function templateOf(key: string | null | undefined): CertTemplate {
  return CERT_TEMPLATES[key || ''] || CERT_TEMPLATES['lideranca-gca']
}

/** "Luís Carlos & Mary Ellen" */
export function coupleLabel(name1: string, name2?: string | null) {
  return [name1, name2].map(s => (s || '').trim()).filter(Boolean).join(' & ')
}

/** "luís carlos" → "Luís Carlos" (mantém "de/da/do/dos/das/e" minúsculos) */
export function tidyName(s: string) {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && ['de', 'da', 'do', 'dos', 'das', 'e'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()
function loadImage(src: string) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    }))
  }
  return imageCache.get(src)!
}

/** Desenha o certificado (modelo + nome do casal) num canvas do tamanho do modelo. */
export async function drawCertificate(canvas: HTMLCanvasElement, templateKey: string, name1: string, name2?: string | null) {
  const t = templateOf(templateKey)
  const family = certFont.style.fontFamily
  const [img] = await Promise.all([
    loadImage(t.src),
    document.fonts.load(`italic 600 ${t.name.fontSize}px ${family}`).catch(() => null),
    document.fonts.load(`600 ${t.name.fontSize}px ${family}`).catch(() => null),
  ])
  canvas.width = t.width
  canvas.height = t.height
  const g = canvas.getContext('2d')!
  g.drawImage(img, 0, 0, t.width, t.height)

  // Nomes em itálico; o "&" em letra normal (como no modelo)
  const parts = [
    { text: (name1 || '').trim(), italic: true },
    ...(name1?.trim() && name2?.trim() ? [{ text: ' & ', italic: false }] : []),
    { text: (name2 || '').trim(), italic: true },
  ].filter(p => p.text)
  if (parts.length === 0) return

  const fontOf = (italic: boolean, size: number) => `${italic ? 'italic ' : ''}600 ${size}px ${family}`
  const widthAt = (size: number) => parts.reduce((w, p) => { g.font = fontOf(p.italic, size); return w + g.measureText(p.text).width }, 0)

  // Diminui a fonte até caber na linha
  let size = t.name.fontSize
  while (widthAt(size) > t.name.maxWidth && size > 28) size -= 2

  g.fillStyle = t.name.color
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  let x = t.name.cx - widthAt(size) / 2
  for (const p of parts) {
    g.font = fontOf(p.italic, size)
    g.fillText(p.text, x, t.name.baseline)
    x += g.measureText(p.text).width
  }
}

/**
 * Gera um PDF (A4 deitado, uma página por certificado) e baixa.
 * O certificado é centralizado na folha mantendo a proporção.
 */
export async function downloadCertificatesPdf(
  items: { templateKey: string; name1: string; name2?: string | null }[],
  fileName: string,
  onProgress?: (done: number, total: number) => void,
) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const canvas = document.createElement('canvas')

  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const t = templateOf(it.templateKey)
    await drawCertificate(canvas, it.templateKey, it.name1, it.name2)
    const ratio = Math.min(pageW / t.width, pageH / t.height)
    const w = t.width * ratio, h = t.height * ratio
    if (i > 0) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.86), 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST')
    onProgress?.(i + 1, items.length)
    // devolve o controle à tela a cada página (mostra o progresso)
    await new Promise(r => setTimeout(r, 0))
  }
  pdf.save(fileName)
}
