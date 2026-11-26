import { getLang } from './prefs'

const TZ = 'Asia/Kuala_Lumpur'
/** Dates follow the chosen language (the time zone is always Malaysia). */
const locale = (): string => (getLang() === 'en' ? 'en-MY' : 'ms-MY')

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? 'UTC' : TZ }).format(d)
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(d)
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(d)
}

/** <input type="datetime-local"> value (Malaysia time) → ISO with the +08:00 offset the gateway expects. */
export const fromLocalInput = (v: string): string => (v ? `${v}:00+08:00` : '')

/** ISO → datetime-local value in Malaysia time. */
export function toLocalInput(iso: string): string {
  if (!iso) return ''
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16)
}

/** Today in Malaysia time as YYYY-MM-DD (call from handlers/initialisers, never during render). */
export const todayIso = (): string => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10)

export const isFuture = (iso: string): boolean => Boolean(iso) && Date.parse(iso) > Date.now()

export const formatBytes = (n: number): string => (n < 1024 ? `${n} B` : n < 1_048_576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1_048_576).toFixed(1)} MB`)
