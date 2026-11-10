'use client'

import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

export interface ExportMember {
  nome: string
  telefone: string
  situacao: string
  nascimento: string
  idade: string
  sexo: string
  endereco: string
  bairro: string
  novosMembros: string
  rhema: string
  estadoCivil: string
  conjuge: string
  filhos: string
  serveEm: string
  desde: string
}

export interface ExportHeader {
  gca: string
  lideres: string
  supervisor: string
  local: string
  anfitriao: string
  endereco: string
  reuniao: string
  adultos: number
  criancas: number
  limite: string
}

interface Props {
  header: ExportHeader
  members: ExportMember[]
}

const COLUMNS: { key: keyof ExportMember; label: string }[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'telefone', label: 'WhatsApp' },
  { key: 'situacao', label: 'Situação no GCA' },
  { key: 'nascimento', label: 'Nascimento' },
  { key: 'idade', label: 'Idade' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'novosMembros', label: 'Novos Membros' },
  { key: 'rhema', label: 'RHEMA' },
  { key: 'estadoCivil', label: 'Estado civil' },
  { key: 'conjuge', label: 'Cônjuge' },
  { key: 'filhos', label: 'Filhos (até 11 anos)' },
  { key: 'serveEm', label: 'Serve em' },
  { key: 'desde', label: 'No GCA desde' },
]

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
const today = () => new Date().toLocaleDateString('pt-BR')

/** Baixar a lista de membros do GCA: planilha (abre no Excel) ou PDF. */
export function ExportMembersButtons({ header, members }: Props) {
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null)
  const base = `membros-${slug(header.gca)}`

  function downloadCsv() {
    setBusy('csv')
    // Ponto e vírgula + BOM: o Excel em português abre direto, com acentos certos
    const esc = (v: string | number) => {
      const s = String(v ?? '')
      return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [
      [`GCA: ${header.gca}`],
      [`Líderes: ${header.lideres || '—'}`, `Supervisor: ${header.supervisor || '—'}`],
      [`Local: ${header.local || '—'}`, `Anfitrião: ${header.anfitriao || '—'}`, `Endereço: ${header.endereco || '—'}`],
      [`Reunião: ${header.reuniao || '—'}`, `Adultos: ${header.adultos}${header.limite ? ` (limite ${header.limite})` : ''}`, `Crianças: ${header.criancas}`],
      [`Gerado em ${today()}`],
      [],
      COLUMNS.map(c => c.label),
      ...members.map(m => COLUMNS.map(c => m[c.key])),
    ]
    const csv = '﻿' + lines.map(l => l.map(esc).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${base}.csv`
    a.click()
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
      doc.text(header.gca, 12, 15)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 80)
      const info = [
        `Líderes: ${header.lideres || '—'}   ·   Supervisor: ${header.supervisor || '—'}`,
        `Local: ${header.local || '—'}${header.anfitriao ? `   ·   Anfitrião: ${header.anfitriao}` : ''}${header.endereco ? `   ·   ${header.endereco}` : ''}`,
        `Reunião: ${header.reuniao || '—'}   ·   Adultos: ${header.adultos}${header.limite ? ` (limite ${header.limite})` : ''}   ·   Crianças: ${header.criancas}`,
      ]
      info.forEach((t, i) => doc.text(t, 12, 21 + i * 4.5))
      doc.text(`Gerado em ${today()}`, W - 12, 15, { align: 'right' })

      // No PDF (folha deitada) vão as colunas que cabem bem para conferência
      const pdfCols: { key: keyof ExportMember; label: string; width?: number }[] = [
        { key: 'nome', label: 'Nome', width: 44 },
        { key: 'telefone', label: 'WhatsApp', width: 27 },
        { key: 'idade', label: 'Idade', width: 13 },
        { key: 'bairro', label: 'Bairro', width: 26 },
        { key: 'situacao', label: 'Situação', width: 26 },
        { key: 'novosMembros', label: 'Novos Membros', width: 25 },
        { key: 'rhema', label: 'RHEMA', width: 18 },
        { key: 'conjuge', label: 'Cônjuge', width: 30 },
        { key: 'filhos', label: 'Filhos (até 11)', width: 32 },
        { key: 'serveEm', label: 'Serve em' },
      ]
      autoTable(doc, {
        startY: 37,
        head: [['#', ...pdfCols.map(c => c.label)]],
        body: members.map((m, i) => [String(i + 1), ...pdfCols.map(c => m[c.key] || '—')]),
        styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [76, 29, 149], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 243, 255] },
        columnStyles: Object.fromEntries([[0, { cellWidth: 7, halign: 'right' }], ...pdfCols.map((c, i) => [i + 1, c.width ? { cellWidth: c.width } : {}])]),
        margin: { left: 12, right: 12 },
        didDrawPage: () => {
          const page = doc.getNumberOfPages()
          doc.setFontSize(8); doc.setTextColor(150)
          doc.text(`${header.gca} · página ${page}`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' })
        },
      })
      doc.save(`${base}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={downloadCsv} disabled={!!busy || members.length === 0} className={btn} title="Abre no Excel / Google Planilhas">
        {busy === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600" />} Baixar planilha
      </button>
      <button onClick={downloadPdf} disabled={!!busy || members.length === 0} className={btn}>
        {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-600" />} Baixar PDF
      </button>
    </div>
  )
}
