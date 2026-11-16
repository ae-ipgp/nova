import type { ActionMap, ActionName, ApiErrorCode, ApiResponse } from '@shared/api-contract'
import { BusyError } from './lock'

/** Hard cap on request size (uploads are base64 in the body). */
export const MAX_BODY_BYTES = 10 * 1024 * 1024

export interface RequestContext {
  now(): Date
  schemaVersion(): number | null
  configured(): boolean
}

type Access = 'public' | 'authenticated'

interface Handler<A extends ActionName> {
  /**
   * 'public' handlers may run without a token and must only return published,
   * public columns. Everything else requires a verified Supabase session and a
   * role check against the user_roles sheet (Phase 1).
   */
  access: Access
  run(payload: ActionMap[A]['payload'], ctx: RequestContext): ActionMap[A]['result']
}

const HANDLERS: { [A in ActionName]: Handler<A> } = {
  'system.health': {
    access: 'public',
    run: (_payload, ctx) => ({
      status: 'ok',
      schemaVersion: ctx.schemaVersion(),
      configured: ctx.configured(),
      time: ctx.now().toISOString(),
    }),
  },
}

function fail(code: ApiErrorCode, message: string): ApiResponse<never> {
  return { ok: false, error: { code, message } }
}

function isActionName(value: unknown): value is ActionName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(HANDLERS, value)
}

export function handleRequest(rawBody: string, ctx: RequestContext): ApiResponse<unknown> {
  if (rawBody.length > MAX_BODY_BYTES) return fail('BAD_REQUEST', 'Permintaan terlalu besar.')

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return fail('BAD_REQUEST', 'Format permintaan tidak sah.')
  }
  if (typeof body !== 'object' || body === null) return fail('BAD_REQUEST', 'Format permintaan tidak sah.')

  const { action, payload } = body as { action?: unknown; payload?: unknown }
  if (!isActionName(action)) return fail('NOT_FOUND', 'Tindakan tidak dikenali.')

  const handler = HANDLERS[action] as Handler<ActionName>
  if (handler.access !== 'public') {
    // Phase 1: verify the Supabase token and load roles from user_roles.
    // Until then every non-public action is refused.
    return fail('UNAUTHENTICATED', 'Sila log masuk.')
  }

  try {
    const data = handler.run((payload ?? {}) as never, ctx)
    return { ok: true, data }
  } catch (err) {
    if (err instanceof BusyError) return fail('BUSY', err.message)
    console.error(err)
    // Never leak stack traces or internal details to the client.
    return fail('INTERNAL', 'Ralat dalaman. Sila cuba lagi.')
  }
}
