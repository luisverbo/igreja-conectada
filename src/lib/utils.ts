import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, differenceInMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    const days = differenceInDays(new Date(), d)
    if (days === 0) return 'Hoje'
    if (days === 1) return 'Ontem'
    if (days < 30) return `${days} dias atrás`
    const months = differenceInMonths(new Date(), d)
    if (months === 1) return '1 mês atrás'
    if (months < 12) return `${months} meses atrás`
    return formatDate(date)
  } catch {
    return '—'
  }
}

export function journeyDuration(startDate: string | null | undefined): string {
  if (!startDate) return '—'
  try {
    const d = parseISO(startDate)
    const months = differenceInMonths(new Date(), d)
    const days = differenceInDays(new Date(), d)
    if (days < 30) return `${days} dias`
    if (months < 12) return `${months} meses`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem > 0 ? `${years} ano(s) e ${rem} meses` : `${years} ano(s)`
  } catch {
    return '—'
  }
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function getAge(birthDate: string | null | undefined): string {
  if (!birthDate) return '—'
  try {
    const d = parseISO(birthDate)
    const age = differenceInMonths(new Date(), d)
    return `${Math.floor(age / 12)} anos`
  } catch {
    return '—'
  }
}

export function whatsappLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  const encoded = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${number}${encoded ? `?text=${encoded}` : ''}`
}
