/**
 * Contract between the web app and the Apps Script gateway (ADR-0001).
 *
 * Transport: one POST endpoint. Body is JSON sent as text/plain so the browser
 * makes a "simple" CORS request (Apps Script cannot answer preflight).
 * Apps Script cannot set HTTP status codes, so every response is an envelope.
 */

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'BUSY',
  'INTERNAL',
  'NOT_CONFIGURED',
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiError {
  code: ApiErrorCode
  message: string
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export interface ApiRequest<A extends ActionName = ActionName> {
  action: A
  payload: ActionMap[A]['payload']
  /** Supabase access token (JWT). Sent in the body, not a header, to avoid CORS preflight. */
  token?: string
}

export interface HealthResult {
  status: 'ok'
  schemaVersion: number | null
  configured: boolean
  time: string
}

/**
 * Every gateway action. Phase 0 exposes health only; each later phase adds
 * its actions here first so client and server stay in lockstep.
 */
export interface ActionMap {
  'system.health': { payload: Record<string, never>; result: HealthResult }
}

export type ActionName = keyof ActionMap
