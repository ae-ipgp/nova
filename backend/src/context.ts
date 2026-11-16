import type { RoleKey } from '@shared/domain'
import { ROLE_KEYS } from '@shared/domain'
import type { AuthUser } from './auth'
import type { Row, TableStore } from './store'

export interface Actor {
  user: AuthUser
  profile: Row
  roles: RoleKey[]
}

export interface HandlerContext {
  store: TableStore
  now: Date
  uuid(): string
  /** Set for every non-public action. Null for public actions and unregistered identities. */
  actor: Actor | null
  /** Verified sign-in identity (non-public actions only). */
  identity: AuthUser | null
  audit(action: string, entityType: string, entityId: string, before: unknown, after: unknown): void
}

export function isActiveProfile(profile: Row | undefined): boolean {
  return profile?.account_status === 'active'
}

export function activeRolesOf(store: TableStore, profileId: string): RoleKey[] {
  const roles = store
    .all('user_roles')
    .filter((r) => r.profile_id === profileId && !r.revoked_at)
    .map((r) => r.role_key)
    .filter((k): k is RoleKey => (ROLE_KEYS as readonly string[]).includes(k) && k !== 'public')
  return [...new Set(roles)]
}

export function makeAudit(store: TableStore, now: Date, uuid: () => string, actorId: () => string): HandlerContext['audit'] {
  return (action, entityType, entityId, before, after) => {
    store.insert('audit_logs', {
      id: uuid(),
      actor_id: actorId(),
      action,
      entity_type: entityType,
      entity_id: entityId,
      before_json: before === undefined || before === null ? '' : JSON.stringify(before),
      after_json: after === undefined || after === null ? '' : JSON.stringify(after),
      created_at: now.toISOString(),
    })
  }
}
