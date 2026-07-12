'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Copy, Check, Download, Printer } from 'lucide-react'

interface Props {
  token: string
  churchName: string
}

export function ChurchQrCard({ token, churchName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const link = `${window.location.origin}/inscricao/igreja/${token}`
    setUrl(link)
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, link, {
        width: 180,
        margin: 1,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      })
    }
  }, [token])

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function download() {
    const dataUrl = await QRCode.toDataURL(url, { width: 800, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'qrcode-inscricao-novos-membros.png'
    a.click()
  }

  async function print() {
    const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } })
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html>
        <head><title>QR Code — Inscrição Novos Membros</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 95vh; margin: 0;">
          <h1 style="font-size: 28px; margin-bottom: 4px; color: #1e1b4b;">${churchName}</h1>
          <h2 style="font-size: 20px; font-weight: 600; color: #7c3aed; margin-top: 0;">Curso de Novos Membros</h2>
          <img src="${dataUrl}" style="width: 340px; height: 340px; margin: 24px 0;" />
          <p style="font-size: 18px; color: #334155; margin: 0;">📱 Aponte a câmera do celular</p>
          <p style="font-size: 16px; color: #64748b; margin-top: 4px;">e faça sua inscrição na hora!</p>
          <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
        </body>
      </html>
    `)
    w.document.close()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <QrCode className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-bold text-slate-900">QR Code de Inscrição</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Imprima e deixe na igreja. O link é <strong>fixo</strong> — se houver turma aberta a pessoa
        se inscreve direto; se não, entra na fila de espera e é matriculada automaticamente na próxima turma.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="rounded-xl border border-slate-100 p-2 bg-white flex-shrink-0">
          <canvas ref={canvasRef} className="block" />
        </div>

        <div className="flex-1 w-full space-y-2">
          <button
            onClick={copy}
            className={`w-full flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-semibold transition-colors ${
              copied
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Link copiado!' : 'Copiar link'}
          </button>
          <button
            onClick={download}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Baixar PNG
          </button>
          <button
            onClick={print}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir cartaz
          </button>
        </div>
      </div>
    </div>
  )
}
