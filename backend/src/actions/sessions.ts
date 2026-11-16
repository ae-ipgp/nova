import type { PublicSession, SessionInfo } from '@shared/api-contract'
import { SESSION_STATUSES, type SessionStatus } from '@shared/domain'
import type { TableStore, Row } from '../store'

export function toSessionInfo(row: Row): SessionInfo {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: ((SESSION_STATUSES as readonly string[]).includes(row.status) ? row.status : 'planned') as SessionStatus,
  }
}

export function toPublicSession(row: Row): PublicSession {
  return { id: row.id, name: row.name, startDate: row.start_date, endDate: row.end_date }
}

export function findActiveSession(store: TableStore): Row | undefined {
  return store.find('jpp_sessions', (r) => r.status === 'active')
}
