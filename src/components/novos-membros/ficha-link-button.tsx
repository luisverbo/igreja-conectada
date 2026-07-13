'use client'

import { useState } from 'react'
import { FileText, Check, Copy, X, QrCode } from 'lucide-react'
import QRCode from 'qrcode'

interface Props {
  token: string
  turmaName: string
}

export function FichaLinkButton({ token, turmaName }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState('')

  const url = typeof window !== 'undefined' ? `${window.location.origin}/ficha/${token}` : ''

  async function openModal() {
    setOpen(true)
    const dataUrl = await QRCode.toDataURL(`${window.location.origin}/ficha/${token}`, { width: 240, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } })
    setQr(dataUrl)
  }

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function print() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Ficha — ${turmaName}</title></head>
      <body style="font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:95vh;margin:0">
        <h1 style="color:#1e1b4b;margin-bottom:2px">Ficha de Novos Membros</h1>
        <h2 style="color:#7c3aed;font-weight:600;margin-top:0">${turmaName}</h2>
        <img src="${qr}" style="width:320px;height:320px;margin:24px 0" />
        <p style="font-size:18px;color:#334155">📱 Aponte a câmera e preencha sua ficha</p>
        <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <>
      <button onClick={openModal} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
        <FileText className="h-4 w-4" />
        Link da Ficha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Ficha da Turma</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                O próprio aluno preenche a ficha por este link/QR code. Voluntários também podem preencher para quem tiver dificuldade.
              </p>
              {qr && (
                <div className="flex justify-center">
                  <div className="rounded-xl border border-slate-100 p-2">
                    <img src={qr} alt="QR Code" className="w-40 h-40" />
                  </div>
                </div>
              )}
              <button onClick={copy} className={`w-full flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-semibold transition-colors ${copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Link copiado!' : 'Copiar link'}
              </button>
              <button onClick={print} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700">
                <QrCode className="h-4 w-4" /> Imprimir QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
