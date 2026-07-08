import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date | undefined | null, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: es })
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
}

export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function formatCurrency(value: number | undefined | null, currency = 'EUR'): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(value)
}

export function formatNumber(value: number | undefined | null, decimals = 0): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}

export function formatDistance(km: number | undefined | null): string {
  if (km == null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${formatNumber(km, 1)} km`
}

export function formatSpeed(kmh: number | undefined | null): string {
  if (kmh == null) return '—'
  return `${formatNumber(kmh, 0)} km/h`
}

export function formatFuel(liters: number | undefined | null): string {
  if (liters == null) return '—'
  return `${formatNumber(liters, 1)} L`
}

export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '—'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `+34 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  return phone
}
