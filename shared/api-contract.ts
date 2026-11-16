/**
 * Contract between the web app and the Apps Script gateway (ADR-0001).
 *
 * Transport: one POST endpoint. Body is JSON sent as text/plain so the browser
 * makes a "simple" CORS request (Apps Script cannot answer preflight).
 * Apps Script cannot set HTTP status codes, so every response is an envelope.
 */
import type { AccountStatus, AssignableRole, RoleKey, SessionStatus } from './domain'

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

// ---------------------------------------------------------------------------
// Payload and result types
// ---------------------------------------------------------------------------

export interface HealthResult {
  status: 'ok'
  schemaVersion: number | null
  configured: boolean
  time: string
}

/** Public projection of a JPP session (jpp_sessions.publicColumns). */
export interface PublicSession {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface SessionInfo extends PublicSession {
  status: SessionStatus
}

/**
 * - active:       registered, account active, may use the workspace
 * - unregistered: valid DELIMa sign-in, but SUAK has not registered this email
 * - inactive:     registered, but suspended or deactivated
 */
export type AccessStatus = 'active' | 'unregistered' | 'inactive'

export interface MeResult {
  email: string
  status: AccessStatus
  profile: { id: string; fullName: string; accountStatus: AccountStatus } | null
  roles: RoleKey[]
  activeSession: PublicSession | null
  membership: { position: string; bureau: string } | null
}

export interface UserSummary {
  profileId: string
  email: string
  fullName: string
  accountStatus: AccountStatus
  /** True once the person has signed in at least once. */
  linked: boolean
  roles: AssignableRole[]
  position: string
  bureau: string
}

export interface RegisterUserPayload {
  email: string
  fullName: string
  roles: AssignableRole[]
  /** Optional membership in the active JPP session. */
  position?: string
  bureau?: string
}

/**
 * Every gateway action. Each phase adds its actions here first so client and
 * server stay in lockstep. Access rules live in backend/src/actions.
 */
export interface ActionMap {
  'system.health': { payload: Record<string, never>; result: HealthResult }
  'session.active': { payload: Record<string, never>; result: PublicSession | null }
  'auth.me': { payload: Record<string, never>; result: MeResult }
  'admin.users.list': { payload: Record<string, never>; result: UserSummary[] }
  'admin.users.register': { payload: RegisterUserPayload; result: UserSummary }
  'admin.users.setStatus': {
    payload: { profileId: string; status: Exclude<AccountStatus, 'invited'> }
    result: UserSummary
  }
  'admin.roles.grant': { payload: { profileId: string; role: AssignableRole }; result: UserSummary }
  'admin.roles.revoke': { payload: { profileId: string; role: AssignableRole }; result: UserSummary }
  'admin.sessions.list': { payload: Record<string, never>; result: SessionInfo[] }
  'admin.sessions.create': { payload: { name: string; startDate: string; endDate: string }; result: SessionInfo }
  'admin.sessions.activate': { payload: { sessionId: string }; result: SessionInfo[] }
}

export type ActionName = keyof ActionMap
