'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

export interface ExportColumn { key: string; label: string; pdfWidth?: number; pdfHide?: boolean }

interface Props {
  title: string
  /** linhas de informação abaixo do título */
  info?: string[]
  columns: ExportColumn[]
  rows: Record<string, string | number | null | undefined>[]
  fileBase: string
}

const today = () => new Date().toLocaleDateString('pt-BR')

/** Baixar uma lista em planilha (abre no Excel) ou PDF (A4 deitado). */
export function ExportTableButtons({ title, info = [], columns, rows, fileBase }: Props) {
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null)

  function downloadCsv() {
    setBusy('csv')
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [[title], ...info.map(i => [i]), [`Gerado em ${today()}`], [], columns.map(c => c.label), ...rows.map(r => columns.map(c => r[c.key]))]
    const csv = '﻿' + lines.map(l => l.map(esc).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `${fileBase}.csv`; a.click()
    URL.revokeObjectURL(url)
    setBusy(null)
  }

  async function downloadPdf() {
    setBusy('pdf')
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(30, 10, 60)
      doc.text(title, 12, 15)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 80)
      info.forEach((t, i) => doc.text(t, 12, 21 + i * 4.5))
      doc.text(`Gerado em ${today()}`, W - 12, 15, { align: 'right' })
      const cols = columns.filter(c => !c.pdfHide)
      autoTable(doc, {
        startY: 23 + info.length * 4.5,
        head: [['#', ...cols.map(c => c.label)]],
        body: rows.map((r, i) => [String(i + 1), ...cols.map(c => String(r[c.key] ?? '') || '—')]),
        styles: { fontSize: 8, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [76, 29, 149], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 243, 255] },
        columnStyles: Object.fromEntries([[0, { cellWidth: 7, halign: 'right' }], ...cols.map((c, i) => [i + 1, c.pdfWidth ? { cellWidth: c.pdfWidth } : {}])]),
        margin: { left: 12, right: 12 },
        didDrawPage: () => {
          doc.setFontSize(8); doc.setTextColor(150)
          doc.text(`${title} · página ${doc.getNumberOfPages()}`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' })
        },
      })
      doc.save(`${fileBase}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={downloadCsv} disabled={!!busy || rows.length === 0} className={btn} title="Abre no Excel / Google Planilhas">
        {busy === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />} Baixar planilha
      </button>
      <button onClick={downloadPdf} disabled={!!busy || rows.length === 0} className={btn}>
        {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-600" />} Baixar PDF
      </button>
    </div>
  )
}
