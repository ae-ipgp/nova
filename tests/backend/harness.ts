import type { ActionMap, ActionName, ApiResponse } from '@shared/api-contract'
import type { AuthUser, TokenVerifier } from '../../backend/src/auth'
import { bootstrap } from '../../backend/src/bootstrap'
import type { LockLike } from '../../backend/src/lock'
import { handleRequest, type GatewayDeps } from '../../backend/src/router'
import { TableStore, type Row } from '../../backend/src/store'
import type { SheetName } from '@shared/schema'
import { MemoryIO } from './memory-io'

export const SUAK = { id: 'u-suak', email: 'suak@moe-dl.edu.my' }

/** In-memory gateway with a token → user table instead of Supabase. */
export class Gateway {
  readonly io = new MemoryIO()
  readonly users = new Map<string, AuthUser>()
  lockAvailable = true
  lockCalls = 0
  verifierConfigured = true
  private seq = 0

  readonly deps: GatewayDeps = {
    now: () => new Date('2026-11-16T09:00:00.000Z'),
    uuid: () => `id-${++this.seq}`,
    openStore: () => new TableStore(this.io),
    lock: {
      tryLock: () => (this.lockCalls++, this.lockAvailable),
      releaseLock: () => undefined,
    } satisfies LockLike,
    verifier: () => (this.verifierConfigured ? ({ verify: (t) => this.users.get(t) ?? null } satisfies TokenVerifier) : null),
    schemaVersion: () => 2,
    configured: () => true,
  }

  /** Registers a sign-in identity; the token is the user id. */
  identity(id: string, email: string): string {
    this.users.set(id, { id, email })
    return id
  }

  /** Bootstrap with SUAK, then SUAK signs in once (links + activates). */
  static withSuak(): Gateway {
    const gw = new Gateway()
    bootstrap(new TableStore(gw.io), { suakEmail: SUAK.email, suakName: 'Setiausaha Agung', now: gw.deps.now(), uuid: gw.deps.uuid })
    gw.identity(SUAK.id, SUAK.email)
    gw.ok('auth.me', {}, SUAK.id)
    return gw
  }

  call<A extends ActionName>(action: A, payload: ActionMap[A]['payload'] | unknown, token?: string): ApiResponse<ActionMap[A]['result']> {
    return handleRequest(JSON.stringify({ action, payload, token }), this.deps) as ApiResponse<ActionMap[A]['result']>
  }

  ok<A extends ActionName>(action: A, payload: ActionMap[A]['payload'] | unknown, token?: string): ActionMap[A]['result'] {
    const res = this.call(action, payload, token)
    if (!res.ok) throw new Error(`${action} failed: ${res.error.code} ${res.error.message}`)
    return res.data
  }

  errorCode(action: ActionName, payload: unknown, token?: string): string | null {
    const res = this.call(action, payload, token)
    return res.ok ? null : res.error.code
  }

  rows(name: SheetName): Row[] {
    return new TableStore(this.io).all(name)
  }

  /** SUAK registers a user, who then gets a sign-in identity. Returns the token. */
  member(id: string, roles: ActionMap['admin.users.register']['payload']['roles'], extra: Partial<ActionMap['admin.users.register']['payload']> = {}): string {
    const email = `${id}@moe-dl.edu.my`
    this.ok('admin.users.register', { email, fullName: `Nama ${id}`, roles, ...extra }, SUAK.id)
    return this.identity(`u-${id}`, email)
  }
}
