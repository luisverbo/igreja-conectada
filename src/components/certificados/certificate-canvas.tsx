'use client'

import { useEffect, useRef } from 'react'
import { drawCertificate, templateOf } from '@/lib/certificate'

interface Props {
  templateKey: string
  name1: string
  name2?: string | null
  className?: string
}

/** Prévia do certificado — mesmo desenho usado no PDF. */
export function CertificateCanvas({ templateKey, name1, name2, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const t = templateOf(templateKey)

  useEffect(() => {
    if (ref.current) drawCertificate(ref.current, templateKey, name1, name2).catch(() => {})
  }, [templateKey, name1, name2])

  return (
    <canvas
      ref={ref}
      width={t.width}
      height={t.height}
      className={className}
      style={{ width: '100%', height: 'auto', aspectRatio: `${t.width} / ${t.height}` }}
    />
  )
}
