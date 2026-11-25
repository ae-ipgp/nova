import { badRequest, forbidden, notFound } from '../errors'
import type { Actor, HandlerContext } from '../context'
import { hasArea } from '../context'
import type { Area } from '@shared/domain'
import type { Row, TableStore } from '../store'

export const MAX_LIST = 500

export function nameOf(store: TableStore, profileId: string): string {
  if (!profileId) return ''
  if (profileId.startsWith('system:')) return 'Sistem'
  return store.get('profiles', profileId)?.full_name ?? ''
}

export function person(store: TableStore, profileId: string): { profileId: string; name: string } {
  return { profileId, name: nameOf(store, profileId) }
}

/** Newest first by an ISO timestamp column, capped (Sheets has no server-side paging). */
export function newest(rows: Row[], column = 'created_at', max = MAX_LIST): Row[] {
  return [...rows].sort((a, b) => (b[column] || '').localeCompare(a[column] || '')).slice(0, max)
}

export function requireActor(ctx: HandlerContext): Actor {
  if (!ctx.actor) throw forbidden()
  return ctx.actor
}

export const isSuak = (actor: Actor | null): boolean => !!actor?.roles.includes('suak')
export const isStaff = (actor: Actor | null): boolean => !!actor && (actor.roles.includes('suak') || actor.roles.includes('secretariat'))

export function requireArea(ctx: HandlerContext, area: Area, message = 'Anda tidak mempunyai kuasa untuk tindakan ini.'): Actor {
  const actor = requireActor(ctx)
  if (!hasArea(actor, area)) throw forbidden(message)
  return actor
}

export function mustGet(store: TableStore, sheet: Parameters<TableStore['get']>[0], id: string, message?: string): Row {
  const row = store.get(sheet, id)
  if (!row) throw notFound(message)
  return row
}

export function requireReason(reason: string, min = 5): string {
  const r = reason.trim()
  if (r.length < min) throw badRequest(`Sebab diperlukan (sekurang-kurangnya ${min} aksara).`)
  if (r.length > 500) throw badRequest('Sebab terlalu panjang.')
  return r
}

/** ISO date-time (to the minute is enough) validation. */
export function isoDateTime(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw badRequest(`${label} tidak sah.`)
  }
  return value
}

export const todayIso = (now: Date): string => now.toISOString().slice(0, 10)

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(user.length - 2, 6)))}@${domain}`
}

/** Project a row onto its public columns — the only fields an anonymous caller may ever see. */
export function pick(row: Row, columns: readonly string[]): Row {
  return Object.fromEntries(columns.map((c) => [c, row[c] ?? '']))
}
