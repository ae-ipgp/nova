import { vi } from 'vitest'
import type { MeResult } from '@shared/api-contract'
import type { RoleKey } from '@shared/domain'
import type { AuthState, AuthValue } from '@/app/auth-context'

export function me(overrides: Partial<MeResult> = {}): MeResult {
  return {
    email: 'ali@moe-dl.edu.my',
    status: 'active',
    profile: { id: 'p1', fullName: 'Ali Ahmad', accountStatus: 'active' },
    roles: ['member'],
    activeSession: { id: 's1', name: 'Legasi Ke-72', startDate: '2026-03-01', endDate: '2027-02-28' },
    membership: null,
    ...overrides,
  }
}

export function liveAuth(state: AuthState, roles?: RoleKey[]): AuthValue {
  const derived = state.status === 'signed_in' && state.me.status === 'active' ? state.me.roles : []
  return {
    mode: 'live',
    state,
    roles: roles ?? derived,
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    getToken: async () => 'token',
    refresh: vi.fn(async () => {}),
  }
}

export const signedInAs = (...roles: RoleKey[]) => liveAuth({ status: 'signed_in', me: me({ roles }) })
