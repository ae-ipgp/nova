import type { ApiErrorCode, ApiResponse } from '@shared/api-contract'
import { isAllowedEmail, normaliseEmail } from '@shared/identity'
import { adminSessionHandlers } from './actions/admin-sessions'
import { adminUserHandlers } from './actions/admin-users'
import { authHandlers } from './actions/auth'
import { systemHandlers, type SystemInfo } from './actions/system'
import type { Handler, HandlerMap } from './actions/types'
import type { AuthUser, TokenVerifier } from './auth'
import { activeRolesOf, isActiveProfile, makeAudit, type Actor, type HandlerContext } from './context'
import { AppError, forbidden, unauthenticated } from './errors'
import { withLock, type LockLike } from './lock'
import type { Row, TableStore } from './store'

/** Hard cap on request size (uploads are base64 in the body). */
export const MAX_BODY_BYTES = 10 * 1024 * 1024

export interface GatewayDeps extends SystemInfo {
  now(): Date
  uuid(): string
  /** Opens a fresh per-request store (each call re-reads sheets lazily). */
  openStore(): TableStore
  lock: LockLike
  /** Null when Supabase is not configured in Script Properties. */
  verifier(): TokenVerifier | null
}

export function buildHandlers(info: SystemInfo): HandlerMap {
  return { ...systemHandlers(info), ...authHandlers, ...adminUserHandlers, ...adminSessionHandlers }
}

function fail(code: ApiErrorCode, message: string): ApiResponse<never> {
  return { ok: false, error: { code, message } }
}

/** Signals that first sign-in linking must be redone inside the lock. */
class NeedsLock extends Error {}

interface Resolution {
  profile: Row | undefined
  needsLink: boolean
}

/**
 * Finds the profile for a verified identity: first by Supabase user id, then
 * (first sign-in) by DELIMa email on a profile not yet linked to anyone.
 */
function resolveProfile(store: TableStore, user: AuthUser): Resolution {
  const byId = store.find('profiles', (p) => p.user_id === user.id)
  if (byId) return { profile: byId, needsLink: false }
  const email = normaliseEmail(user.email)
  const byEmail = store.find('profiles', (p) => normaliseEmail(p.email) === email)
  if (!byEmail) return { profile: undefined, needsLink: false }
  if (byEmail.user_id) {
    // Same email already linked to a different sign-in identity: never re-link silently.
    console.warn(`Profile ${byEmail.id} is linked to another identity; refusing access.`)
    return { profile: undefined, needsLink: false }
  }
  return { profile: byEmail, needsLink: true }
}

export function handleRequest(rawBody: string, deps: GatewayDeps): ApiResponse<unknown> {
  if (rawBody.length > MAX_BODY_BYTES) return fail('BAD_REQUEST', 'Permintaan terlalu besar.')

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return fail('BAD_REQUEST', 'Format permintaan tidak sah.')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail('BAD_REQUEST', 'Format permintaan tidak sah.')

  const { action, payload, token } = body as { action?: unknown; payload?: unknown; token?: unknown }
  const handlers = buildHandlers(deps)
  if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(handlers, action)) {
    return fail('NOT_FOUND', 'Tindakan tidak dikenali.')
  }
  const handler = handlers[action as keyof HandlerMap] as Handler<keyof HandlerMap>

  try {
    const data = execute(handler, payload, typeof token === 'string' ? token : '', deps)
    return { ok: true, data }
  } catch (err) {
    if (err instanceof AppError) return fail(err.code, err.message)
    console.error(err)
    // Never leak stack traces or internal details to the client.
    return fail('INTERNAL', 'Ralat dalaman. Sila cuba lagi.')
  }
}

function execute(handler: Handler<keyof HandlerMap>, payload: unknown, token: string, deps: GatewayDeps): unknown {
  const now = deps.now()

  if (handler.access.kind === 'public') {
    const run = () => {
      const store = deps.openStore()
      const ctx: HandlerContext = { store, now, uuid: deps.uuid, actor: null, identity: null, audit: makeAudit(store, now, deps.uuid, () => 'public') }
      return handler.run(payload, ctx)
    }
    return handler.write ? withLock(deps.lock, run) : run()
  }

  const verifier = deps.verifier()
  if (!verifier) throw new AppError('NOT_CONFIGURED', 'Log masuk belum dikonfigurasi.')
  if (!token) throw unauthenticated()
  const user = verifier.verify(token)
  if (!user) throw unauthenticated('Sesi log masuk tamat atau tidak sah. Sila log masuk semula.')
  if (!isAllowedEmail(user.email)) throw forbidden('Hanya akaun DELIMa (@moe-dl.edu.my) dibenarkan.')

  const run = (inLock: boolean) => {
    const store = deps.openStore()
    const resolution = resolveProfile(store, user)
    let profile = resolution.profile
    let actor: Actor | null = null
    const audit = makeAudit(store, now, deps.uuid, () => actor?.profile.id ?? `user:${user.id}`)

    if (profile && resolution.needsLink) {
      if (!inLock) throw new NeedsLock()
      const before = { user_id: profile.user_id, account_status: profile.account_status }
      profile = store.update('profiles', profile.id, {
        user_id: user.id,
        account_status: profile.account_status === 'invited' ? 'active' : profile.account_status,
        updated_at: now.toISOString(),
      })
      actor = { user, profile, roles: activeRolesOf(store, profile.id) }
      audit('profile.link', 'profile', profile.id, before, { user_id: user.id, account_status: profile.account_status })
    } else if (profile) {
      actor = { user, profile, roles: activeRolesOf(store, profile.id) }
    }

    const ctx: HandlerContext = { store, now, uuid: deps.uuid, actor, identity: user, audit }

    if (handler.access.kind === 'roles') {
      if (!actor || !isActiveProfile(actor.profile)) throw forbidden('Akaun anda belum didaftarkan atau tidak aktif.')
      const allowed = handler.access.roles
      if (allowed !== 'any' && !actor.roles.some((r) => allowed.includes(r))) throw forbidden()
      if (allowed === 'any' && actor.roles.length === 0) throw forbidden()
    }
    return handler.run(payload, ctx)
  }

  if (handler.write) return withLock(deps.lock, () => run(true))
  try {
    return run(false)
  } catch (err) {
    if (err instanceof NeedsLock) return withLock(deps.lock, () => run(true))
    throw err
  }
}
