import { createContext, useContext } from 'react'
import type { MeResult } from '@shared/api-contract'
import type { Area, RoleKey } from '@shared/domain'

/**
 * - live:         Supabase + gateway configured (normal operation)
 * - preview:      local development without configuration; role picker, no data
 * - unconfigured: production build without configuration; workspace unavailable
 */
export type AuthMode = 'live' | 'preview' | 'unconfigured'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'error'; message: string }
  | { status: 'signed_in'; me: MeResult }

export interface AuthValue {
  mode: AuthMode
  state: AuthState
  /** Roles usable right now (empty unless signed in with an active profile). */
  roles: readonly RoleKey[]
  signIn(nextPath?: string): Promise<void>
  signOut(): Promise<void>
  /** Current Supabase access token, refreshed if needed. */
  getToken(): Promise<string | undefined>
  /** Re-reads profile and roles from the gateway. */
  refresh(): Promise<void>
  /** Preview mode only. */
  setPreviewRole?(role: RoleKey): void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an auth provider')
  return ctx
}

/** UX-only check for a delegated area (the gateway enforces it independently). SUAK holds all areas. */
export function useCan(area: Area): boolean {
  const { roles, state } = useAuth()
  if (roles.includes('suak')) return true
  return state.status === 'signed_in' && state.me.areas.includes(area)
}

export function resolveMode(configured: boolean, dev: boolean): AuthMode {
  if (configured) return 'live'
  return dev ? 'preview' : 'unconfigured'
}

export function hasAnyRole(held: readonly RoleKey[], allowed: readonly RoleKey[]): boolean {
  return held.some((r) => allowed.includes(r))
}
